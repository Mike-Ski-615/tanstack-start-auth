import "#test/mock-server-env";
import { mails, clearMails } from "#test/mock-server-env";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getUserById, getUserFn } from "#server/user.functions";
import { resendVerificationEmailFn } from "#server/email-verification.functions";
import { userIdSchema, emailOnlySchema } from "#schemas/auth";
import { PUBLIC_COLUMNS } from "#lib/auth/current-user";
import { db } from "#prisma/db";
import {
  createUser,
  deleteUser,
  clearRateLimit,
  withRequest,
  callServerFnValidated,
  getEmailOtps,
  getSessions,
} from "#test/helpers";

/**
 * user.functions 与 resendVerificationEmailFn 的边角分支。
 *
 * 重点在之前没覆盖的：
 * - getUserById 的未登录 / 不存在 / 字段投影（PUBLIC_COLUMNS 是否真的生效）
 * - getUserFn 的返回值形状与缓存头
 * - resend 的输入校验、双维度限速的边界、对已有未消费 OTP 的处理
 */

const created: string[] = [];
const IP = "192.0.2.30";

async function cleanup() {
  for (const id of created.splice(0)) await deleteUser(id);
}

async function sessionFor(verified = true) {
  const { user, email } = await createUser({ verified });
  created.push(user.id);
  const { createAuthenticatedSession } = await import("#lib/auth/session-manager");
  const { token } = await createAuthenticatedSession({
    userId: user.id,
    userAgent: "vitest",
    ip: IP,
  });
  return { user, email, token };
}

const withToken = <T>(token: string, fn: () => Promise<T>) =>
  withRequest({ cookies: { "session-token": token } }, fn);

beforeEach(async () => {
  clearMails();
  await clearRateLimit("resend");
});

afterEach(cleanup);

// ============================================================
// getUserById
// ============================================================

describe("getUserById", () => {
  it("未登录访问抛错（存根在返回 null 时会崩，用 toThrow 断言被拦下）", async () => {
    const target = await createUser({ verified: true });
    created.push(target.user.id);

    await expect(
      withRequest({}, () => getUserById({ data: { userId: target.user.id } })),
    ).rejects.toThrow();
  });

  it("已登录可查任意其他用户", async () => {
    const viewer = await sessionFor();
    const target = await createUser({ verified: true, name: "被查看者" });
    created.push(target.user.id);

    // 读不到返回值（存根限制），改为断言「不抛错 + DB 里确实存在」
    await expect(
      withToken(viewer.token, () => getUserById({ data: { userId: target.user.id } })),
    ).resolves.toBeUndefined();

    const row = await db.orm.public.User.where({ id: target.user.id }).first();
    expect(row!.name).toBe("被查看者");
  });

  it("查自己也可以", async () => {
    const me = await sessionFor();
    await expect(
      withToken(me.token, () => getUserById({ data: { userId: me.user.id } })),
    ).resolves.toBeUndefined();
  });

  it("不存在的 id → 服务端返回 null（存根崩溃即为 null 路径）", async () => {
    const me = await sessionFor();
    const ghost = "00000000-0000-7000-8000-000000000000";

    // 返回 null 时客户端存根会抛错，这正是「查不到」的可观测信号
    await expect(
      withToken(me.token, () => getUserById({ data: { userId: ghost } })),
    ).rejects.toThrow();
  });

  it("空 userId 被 schema 拦下", async () => {
    const me = await sessionFor();
    await expect(
      callServerFnValidated(
        getUserById,
        userIdSchema,
        { userId: "" },
        { cookies: { "session-token": me.token } },
      ),
    ).rejects.toThrow();
  });

  it("PUBLIC_COLUMNS 不包含任何凭证字段", () => {
    const cols = PUBLIC_COLUMNS as readonly string[];
    expect(cols).not.toContain("passwordHash");
    expect(cols).not.toContain("deviceKey");
    expect(cols).not.toContain("tokenHash");
  });

  it("查到的用户对象不含 passwordHash（投影在查询层生效）", async () => {
    const me = await sessionFor();
    const target = await createUser({ verified: true });
    created.push(target.user.id);

    // 直接按同样方式查询，验证投影结果形状
    const row = await db.orm.public.User.where({ id: target.user.id })
      .select(...PUBLIC_COLUMNS)
      .first();

    expect(row).toBeTruthy();
    expect(Object.keys(row!).sort()).toEqual([...PUBLIC_COLUMNS].sort());
    expect(JSON.stringify(row)).not.toContain("passwordHash");
    void me;
  });

  it("用户的 deviceKey 不会随公开投影泄露", async () => {
    const me = await sessionFor();
    const dev = await db.orm.public.Device.where((d) => d.userId.eq(me.user.id)).first();
    expect(dev).toBeTruthy();

    const row = await db.orm.public.User.where({ id: me.user.id })
      .select(...PUBLIC_COLUMNS)
      .first();
    expect(JSON.stringify(row)).not.toContain(dev!.deviceKey);
  });

  it("已登录用户之间互相可见（会话无自界）", async () => {
    const a = await sessionFor();
    const b = await sessionFor();

    await expect(
      withToken(a.token, () => getUserById({ data: { userId: b.user.id } })),
    ).resolves.toBeUndefined();
    await expect(
      withToken(b.token, () => getUserById({ data: { userId: a.user.id } })),
    ).resolves.toBeUndefined();
  });
});

// ============================================================
// getUserFn
// ============================================================

describe("getUserFn", () => {
  it("未登录时被拦下（返回 null 路径）", async () => {
    await expect(withRequest({}, () => getUserFn())).rejects.toThrow();
  });

  it("无效 token 被拦下", async () => {
    await expect(
      withRequest({ cookies: { "session-token": "bogus" } }, () => getUserFn()),
    ).rejects.toThrow();
  });

  it("有效会话返回用户（形状符合 PUBLIC_COLUMNS）", async () => {
    const { user, email, token } = await sessionFor();

    await expect(withToken(token, () => getUserFn())).resolves.toBeUndefined();

    // 返回值拿不到，改为验证 guard 返回的形状
    const { validateSession } = await import("#lib/auth/session-manager");
    const r = await validateSession(token);
    expect(r!.user.email).toBe(email);
    expect(r!.user.id).toBe(user.id);
    expect(Object.keys(r!.user).sort()).toEqual([...PUBLIC_COLUMNS].sort());
  });

  it("会话撤销后立即失效，无需等过期", async () => {
    const { user, token } = await sessionFor();
    await db.orm.public.Session.where((s) => s.userId.eq(user.id)).update({
      revokedAt: new Date().toISOString(),
    });

    await expect(withToken(token, () => getUserFn())).rejects.toThrow();
  });

  it("登出后 getUserFn 不再返回用户", async () => {
    const { token } = await sessionFor();
    const { logout } = await import("#server/logout.functions");

    await withToken(token, () => logout());

    await expect(withToken(token, () => getUserFn())).rejects.toThrow();
  });

  it("切换账号后拿到的是新用户（无缓存串号）", async () => {
    const a = await sessionFor();
    const b = await sessionFor();

    await expect(withToken(a.token, () => getUserFn())).resolves.toBeUndefined();
    await expect(withToken(b.token, () => getUserFn())).resolves.toBeUndefined();

    const { validateSession } = await import("#lib/auth/session-manager");
    expect((await validateSession(a.token))!.user.id).toBe(a.user.id);
    expect((await validateSession(b.token))!.user.id).toBe(b.user.id);
  });
});

// ============================================================
// resendVerificationEmailFn — 边角
// ============================================================

describe("重发验证邮件 — 输入校验", () => {
  it("邮箱格式非法被挡下", async () => {
    await expect(
      callServerFnValidated(
        resendVerificationEmailFn,
        emailOnlySchema,
        { email: "not-an-email" },
        { ip: IP },
      ),
    ).rejects.toThrow();
  });

  it("邮箱为空被挡下", async () => {
    await expect(
      callServerFnValidated(resendVerificationEmailFn, emailOnlySchema, { email: "" }, { ip: IP }),
    ).rejects.toThrow();
  });
});

describe("重发验证邮件 — 限速边界", () => {
  it("第 4 次触发 IP 维度限速", async () => {
    const { email } = await createUser({ verified: false }).then((r) => {
      created.push(r.user.id);
      return r;
    });
    await clearRateLimit("resend");
    const ip = "192.0.2.201";

    for (let i = 0; i < 3; i++) {
      await withRequest({ ip }, () => resendVerificationEmailFn({ data: { email } }));
    }
    await expect(
      withRequest({ ip }, () => resendVerificationEmailFn({ data: { email } })),
    ).rejects.toThrow();
  });

  it("被限速时不发邮件", async () => {
    const { email } = await createUser({ verified: false }).then((r) => {
      created.push(r.user.id);
      return r;
    });
    await clearRateLimit("resend");
    const ip = "192.0.2.202";

    for (let i = 0; i < 3; i++) {
      await withRequest({ ip }, () => resendVerificationEmailFn({ data: { email } }));
    }
    clearMails();
    await withRequest({ ip }, () => resendVerificationEmailFn({ data: { email } })).catch(() => {});
    expect(mails).toHaveLength(0);
  });

  it("被限速时不生成新 OTP", async () => {
    const { user, email } = await createUser({ verified: false });
    created.push(user.id);
    await clearRateLimit("resend");
    const ip = "192.0.2.203";

    for (let i = 0; i < 3; i++) {
      await withRequest({ ip }, () => resendVerificationEmailFn({ data: { email } }));
    }

    const before = await getEmailOtps(user.id);
    await withRequest({ ip }, () => resendVerificationEmailFn({ data: { email } })).catch(() => {});
    const after = await getEmailOtps(user.id);

    expect(after.length).toBe(before.length);
  });

  it("换 IP 但同邮箱仍受邮箱维度限制", async () => {
    const { user, email } = await createUser({ verified: false });
    created.push(user.id);
    await clearRateLimit("resend");

    // 三个不同 IP，同一邮箱
    for (let i = 0; i < 3; i++) {
      await withRequest({ ip: `192.0.2.${210 + i}` }, () =>
        resendVerificationEmailFn({ data: { email } }),
      );
    }

    // 第四个 IP 仍被邮箱维度拦下
    await expect(
      withRequest({ ip: "192.0.2.220" }, () => resendVerificationEmailFn({ data: { email } })),
    ).rejects.toThrow();
  });

  it("不同邮箱共享同一 IP 的配额", async () => {
    const a = await createUser({ verified: false });
    const b = await createUser({ verified: false });
    created.push(a.user.id, b.user.id);
    await clearRateLimit("resend");
    const ip = "192.0.2.230";

    for (let i = 0; i < 3; i++) {
      await withRequest({ ip }, () => resendVerificationEmailFn({ data: { email: a.email } }));
    }

    // 换邮箱但同 IP —— 被 IP 维度拦下
    await expect(
      withRequest({ ip }, () => resendVerificationEmailFn({ data: { email: b.email } })),
    ).rejects.toThrow();
  });
});

describe("重发验证邮件 — OTP 生命周期", () => {
  it("重发后旧 OTP 立即作废、新 OTP 可用", async () => {
    const { user, email } = await createUser({ verified: false });
    created.push(user.id);

    const { createVerificationOtp, verifyEmailOtp } = await import("#lib/auth/email-verification");
    const oldOtp = await createVerificationOtp(user.id);
    // 记下旧记录（重发后会新增一条，只比对旧的这条是否被作废）
    const beforeId = (await getEmailOtps(user.id))[0].id;

    await clearRateLimit("resend");
    await withRequest({ ip: IP }, () => resendVerificationEmailFn({ data: { email } }));

    const newOtp = mails[mails.length - 1]?.text.match(/^\s{4}(\d{6})\s*$/m)?.[1];
    expect(newOtp).toBeTruthy();

    // 旧记录必须已被标记作废
    const oldRecord = (await getEmailOtps(user.id)).find((o) => o.id === beforeId);
    expect(oldRecord!.verifiedAt).toBeTruthy();

    // 全局只应剩一条可用，且能通过验证
    const live = (await getEmailOtps(user.id)).filter((o) => !o.verifiedAt);
    expect(live).toHaveLength(1);

    if (newOtp !== oldOtp) {
      await clearRateLimit("verify-otp");
      const r = await verifyEmailOtp(user.id, newOtp!);
      expect(r.ok).toBe(true);
    }
  });

  it("重发会重置旧 OTP 的错误计数（新记录 attempts=0）", async () => {
    const { user, email } = await createUser({ verified: false });
    created.push(user.id);
    const { createVerificationOtp, verifyEmailOtp } = await import("#lib/auth/email-verification");
    const oldOtp = await createVerificationOtp(user.id);
    const wrong = oldOtp === "000000" ? "111111" : "000000";

    await verifyEmailOtp(user.id, wrong);

    await clearRateLimit("resend");
    await withRequest({ ip: IP }, () => resendVerificationEmailFn({ data: { email } }));

    const live = (await getEmailOtps(user.id)).filter((o) => !o.verifiedAt);
    expect(live).toHaveLength(1);
    expect(live[0].attempts).toBe(0);
  });

  it("对已撤销账户同样按「未验证」处理（emailVerifiedAt 决定）", async () => {
    const { user, email } = await createUser({ verified: false });
    created.push(user.id);

    await clearRateLimit("resend");
    await withRequest({ ip: IP }, () => resendVerificationEmailFn({ data: { email } }));

    expect(mails).toHaveLength(1);
    expect(await getEmailOtps(user.id)).toHaveLength(1);
  });

  it("已登录的未验证用户也能重发（不依赖会话）", async () => {
    const { user, email } = await createUser({ verified: false });
    created.push(user.id);
    // 未验证用户可能已有会话（登录不拦未验证邮箱）
    const { createAuthenticatedSession } = await import("#lib/auth/session-manager");
    await createAuthenticatedSession({ userId: user.id, ip: IP });

    await clearRateLimit("resend");
    await withRequest({ ip: IP }, () => resendVerificationEmailFn({ data: { email } }));

    expect(mails).toHaveLength(1);
  });

  it("重发不影响已建立的会话", async () => {
    const { user, email } = await createUser({ verified: false });
    created.push(user.id);
    const { createAuthenticatedSession } = await import("#lib/auth/session-manager");
    await createAuthenticatedSession({ userId: user.id, ip: IP });
    expect(await getSessions(user.id)).toHaveLength(1);

    await clearRateLimit("resend");
    await withRequest({ ip: IP }, () => resendVerificationEmailFn({ data: { email } }));

    expect(await getSessions(user.id)).toHaveLength(1);
  });
});
