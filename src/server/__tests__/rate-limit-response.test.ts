import "#test/mock-server-env";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { register } from "#server/register.functions";
import { login } from "#server/login.functions";
import { requestPasswordResetFn } from "#server/reset.functions";
import { resendVerificationEmailFn } from "#server/email-verification.functions";
import {
  createUser,
  deleteUser,
  scopedClearRateLimit,
  withRequest,
  lastResponseStatus,
  uniqueEmail,
  TEST_PASSWORD,
} from "#test/helpers";

/**
 * 限速被触发时的响应层行为。
 *
 * 为什么单独测：被限速时除了抛错，还要设 HTTP 429 与 Retry-After ——
 * 后者只在 4xx/5xx 上有含义，状态码不对这个头就是废的。
 * register 曾经漏设 setResponseStatus(429) 却设了 Retry-After，
 * 而这层行为此前没有任何测试覆盖，漏了不会有人发现。
 */

const created: string[] = [];

async function cleanup() {
  for (const id of created.splice(0)) await deleteUser(id);
}

afterEach(cleanup);

beforeEach(async () => {
  /*
   * 只清**本文件专属 IP** 的计数，不碰别的测试文件。
   *
   * 本文件原先写 clearRateLimit("login", "reset", "resend")，那是全量清除 ——
   * 会擦掉其它测试文件（login.test / reset-password.test / user-and-resend /
   * verify-otp）在同一 type 下建的计数。vitest 多 worker 并行时两边交错，
   * 表现为偶发的 429「操作过于频繁」（本文件与 register 文件都撞上过）。
   *
   * 本文件统一用 203.0.113.240–252 这一段（见各用例里的 ip 常量），
   * 只要按这些 IP 清就不会与任何人冲突。
   *
   * 为何每个 IP 都要清：这些 IP 每次运行都相同，而限速窗口是 1 分钟 ——
   * 短时间连跑两次时上一轮的计数还在，用例会在循环中途就撞上限。
   */
  for (let i = 240; i <= 252; i++) {
    await scopedClearRateLimit(`203.0.113.${i}`, "login", "reset", "resend", "register");
  }
});

/** 返回 { threw, status }。 */
async function call(fn: () => Promise<unknown>) {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  return { threw, status: lastResponseStatus() };
}

describe("被限速时返回 429", () => {
  it("register：打满 IP 配额后返回 429", async () => {
    // 用未被其它文件使用的 IP 段，并**只清自己这个桶**。
    //
    // 不能写 clearRateLimit("register") —— 那会清掉全部 register 计数，
    // 包括 register.test.ts 正在用的 203.0.113.10 等，两边交错执行时互相
    // 擦除，表现为「第 4 次应该被拒却通过了」的偶发失败（本轮真的撞上过）。
    const ip = "203.0.113.240";
    await scopedClearRateLimit(ip, "register");
    for (let i = 0; i < 3; i++) {
      const email = uniqueEmail("rl");
      await withRequest({ ip }, () =>
        register({ data: { name: "A", email, password: TEST_PASSWORD } }),
      );
      const u = await import("#prisma/db").then(({ db }) =>
        db.orm.public.User.where({ email }).first(),
      );
      if (u) created.push(u.id);
    }

    const { threw, status } = await call(() =>
      withRequest({ ip }, () =>
        register({
          data: {
            name: "B",
            email: uniqueEmail("blocked"),
            password: TEST_PASSWORD,
          },
        }),
      ),
    );

    expect(threw).toBe(true);
    expect(status).toBe(429);
  });

  it("login：打满配额后返回 429", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);
    const ip = "203.0.113.241";
    await scopedClearRateLimit(ip, "login");

    for (let i = 0; i < 5; i++) {
      await withRequest({ ip }, () => login({ data: { email, password: "wrongpass" } })).catch(
        () => {},
      );
    }

    const { threw, status } = await call(() =>
      withRequest({ ip }, () => login({ data: { email, password: TEST_PASSWORD } })),
    );

    expect(threw).toBe(true);
    expect(status).toBe(429);
  });

  it("requestPasswordReset：打满配额后返回 429", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);
    const ip = "203.0.113.242";
    await scopedClearRateLimit(ip, "reset");

    for (let i = 0; i < 3; i++) {
      await withRequest({ ip }, () => requestPasswordResetFn({ data: { email } }));
    }

    const { threw, status } = await call(() =>
      withRequest({ ip }, () => requestPasswordResetFn({ data: { email } })),
    );

    expect(threw).toBe(true);
    expect(status).toBe(429);
  });

  it("resendVerificationEmail：IP 维度打满后返回 429", async () => {
    const { user, email } = await createUser({ verified: false });
    created.push(user.id);
    const ip = "203.0.113.243";
    await scopedClearRateLimit(ip, "resend", "verify-otp");

    for (let i = 0; i < 3; i++) {
      await withRequest({ ip }, () => resendVerificationEmailFn({ data: { email } }));
    }

    const { threw, status } = await call(() =>
      withRequest({ ip }, () => resendVerificationEmailFn({ data: { email } })),
    );

    expect(threw).toBe(true);
    expect(status).toBe(429);
  });

  it("resendVerificationEmail：邮箱维度打满后返回 429", async () => {
    const { user, email } = await createUser({ verified: false });
    created.push(user.id);

    // 三个不同 IP 打满邮箱维度。
    //
    // 必须先清这三个 IP 的 resend 计数：它们每次运行都相同，而窗口是 1 分钟 ——
    // 短时间连跑两次时上一轮的计数还在，第一轮循环里就会撞上 IP 上限，
    // 报错位置看着像“邮箱维度”用例坏了，实际是 IP 桶脏了。
    for (let i = 0; i < 3; i++) {
      await scopedClearRateLimit(`203.0.113.${250 + i}`, "resend");
    }
    for (let i = 0; i < 3; i++) {
      await withRequest({ ip: `203.0.113.${250 + i}` }, () =>
        resendVerificationEmailFn({ data: { email } }),
      );
    }

    const { threw, status } = await call(() =>
      withRequest({ ip: "203.0.113.244" }, () => resendVerificationEmailFn({ data: { email } })),
    );

    expect(threw).toBe(true);
    expect(status).toBe(429);
  });
});
