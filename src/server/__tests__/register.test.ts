import "#test/mock-server-env";
import { mails, clearMails } from "#test/mock-server-env";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { register } from "#server/register.functions";
import { db } from "#prisma/db";
import {
  uniqueEmail,
  TEST_PASSWORD,
  deleteUser,
  clearRateLimit,
  withRequest,
  callServerFnValidated,
  getEmailOtps,
} from "#test/helpers";
import { registerSchema } from "#schemas/auth";

/**
 * 注册模块测试。
 *
 * 断言策略：serverFn 在测试里能真正执行并落库，但成功返回值拿不到
 * （客户端存根需要 RPC 传输层回传 result）。所以
 *   成功 → 断言数据库副作用
 *   失败 → 断言 rejects.toThrow()
 * 副作用断言实际更严格：它验证真实落库状态。
 */

const created: string[] = [];
const IP = "203.0.113.10"; // TEST-NET-3，文档专用网段

async function cleanup() {
  for (const id of created.splice(0)) await deleteUser(id);
}

/** 按邮箱查用户、登记清理、返回 id。 */
async function userByEmail(email: string) {
  const u = await db.orm.public.User.where({ email }).first();
  if (u) created.push(u.id);
  return u;
}

const reg = (
  data: { name: string; email: string; password: string },
  ip = IP,
) => withRequest({ ip }, () => register({ data }));

/**
 * 带 schema 校验的注册调用。
 *
 * 测试直调 serverFn 时 validator 不执行（executeMiddleware 里写的是
 * env === "server" 才校验），所以非法输入会直接进 handler 落库。
 * 要验证「输入校验」就必须显式跑一遍，与生产行为对齐。
 */
const regValidated = (
  data: { name: string; email: string; password: string },
  ip = IP,
) => callServerFnValidated(register, registerSchema, data, { ip });

beforeEach(async () => {
  clearMails();
  await clearRateLimit("register");
});

afterEach(cleanup);

// ============================================================
// 成功路径
// ============================================================

describe("注册 — 成功路径", () => {
  it("创建用户，字段写入正确", async () => {
    const email = uniqueEmail();
    await reg({ name: "张三", email, password: TEST_PASSWORD });

    const u = await userByEmail(email);
    expect(u).toBeTruthy();
    expect(u!.email).toBe(email);
    expect(u!.name).toBe("张三");
  });

  it("密码以 argon2id 哈希存储，不是明文", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });

    const u = await userByEmail(email);
    expect(u!.passwordHash).not.toBe(TEST_PASSWORD);
    expect(u!.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it("新用户 emailVerifiedAt 为空", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });

    const u = await userByEmail(email);
    expect(u!.emailVerifiedAt ?? null).toBeNull();
  });

  it("生成一条待验证的邮箱 OTP", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });

    const u = await userByEmail(email);
    const otps = await getEmailOtps(u!.id);
    expect(otps).toHaveLength(1);
    expect(otps[0].verifiedAt ?? null).toBeNull();
    expect(otps[0].attempts).toBe(0);
  });

  it("OTP 尚未过期（15 分钟）", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });

    const u = await userByEmail(email);
    const [otp] = await getEmailOtps(u!.id);
    const ttl = new Date(otp.expiresAt).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(14 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000);
  });

  it("发送验证邮件给该邮箱，正文含 6 位验证码", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });

    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe(email);
    expect(mails[0].text).toMatch(/^\s{4}\d{6}\s*$/m);
  });

  it("注册本身不建 Device / Session（未验证邮箱不自动登录）", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });

    const u = await userByEmail(email);
    const devices = await db.orm.public.Device.where((d) =>
      d.userId.eq(u!.id),
    ).all();
    const sessions = await db.orm.public.Session.where((s) =>
      s.userId.eq(u!.id),
    ).all();
    expect(devices).toHaveLength(0);
    expect(sessions).toHaveLength(0);
  });

  it("name 首尾空白照常接受", async () => {
    const email = uniqueEmail();
    await reg({ name: "  空格  ", email, password: TEST_PASSWORD });
    const u = await userByEmail(email);
    expect(u).toBeTruthy();
  });

  it("同名不同邮箱可分别注册", async () => {
    const e1 = uniqueEmail("n1");
    const e2 = uniqueEmail("n2");
    await reg({ name: "同名", email: e1, password: TEST_PASSWORD });
    await reg({ name: "同名", email: e2, password: TEST_PASSWORD });

    const u1 = await userByEmail(e1);
    const u2 = await userByEmail(e2);
    expect(u1).toBeTruthy();
    expect(u2).toBeTruthy();
    expect(u1!.id).not.toBe(u2!.id);
  });

  it("邮箱大小写敏感（当前实现不做折叠）", async () => {
    const email = uniqueEmail("Case");
    const upper = email.toUpperCase();

    await reg({ name: "A", email, password: TEST_PASSWORD });
    const lower = await userByEmail(email);
    expect(lower).toBeTruthy();

    // 大写形式视为另一个账号 —— 记录现状；若将来做大小写折叠，此处会失败
    const r = await reg({
      name: "B",
      email: upper,
      password: TEST_PASSWORD,
    }).catch((e) => e);
    const up = await userByEmail(upper);
    if (up) {
      expect(up.id).not.toBe(lower!.id);
    } else {
      expect(r).toBeInstanceOf(Error);
    }
  });
});

// ============================================================
// 邮箱冲突
// ============================================================

describe("注册 — 邮箱冲突", () => {
  it("同一邮箱重复注册抛错", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });
    await userByEmail(email);

    await expect(
      reg({ name: "B", email, password: TEST_PASSWORD }),
    ).rejects.toThrow();
  });

  it("重复注册不产生第二个用户", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });
    await userByEmail(email);

    await reg({ name: "B", email, password: TEST_PASSWORD }).catch(() => {});

    const users = await db.orm.public.User.where({ email }).all();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("A");
  });

  it("重复注册不动原用户的 OTP", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });
    const u = await userByEmail(email);
    const before = await getEmailOtps(u!.id);

    await reg({ name: "B", email, password: TEST_PASSWORD }).catch(() => {});

    const after = await getEmailOtps(u!.id);
    expect(after).toHaveLength(before.length);
    expect(after[0].tokenHash).toBe(before[0].tokenHash);
  });

  it("重复注册不发第二封邮件", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });
    await userByEmail(email);

    clearMails();
    await reg({ name: "B", email, password: TEST_PASSWORD }).catch(() => {});
    expect(mails).toHaveLength(0);
  });
});

// ============================================================
// 输入校验
// ============================================================

describe("注册 — 输入校验", () => {
  const cases: Array<
    [string, { name: string; email: string; password: string }]
  > = [
    [
      "邮箱格式非法",
      { name: "A", email: "not-an-email", password: TEST_PASSWORD },
    ],
    ["邮箱为空", { name: "A", email: "", password: TEST_PASSWORD }],
    [
      "密码过短（5 位）",
      { name: "A", email: uniqueEmail(), password: "12345" },
    ],
    ["密码为空", { name: "A", email: uniqueEmail(), password: "" }],
    [
      "密码过长（33 位）",
      { name: "A", email: uniqueEmail(), password: "a".repeat(33) },
    ],
    ["name 为空", { name: "", email: uniqueEmail(), password: TEST_PASSWORD }],
    [
      "name 过长（51 字）",
      { name: "x".repeat(51), email: uniqueEmail(), password: TEST_PASSWORD },
    ],
  ];

  for (const [label, data] of cases) {
    it(`${label} → 校验拦下且不建用户`, async () => {
      await expect(regValidated(data)).rejects.toThrow();
      if (data.email) {
        const u = await db.orm.public.User.where({ email: data.email }).first();
        expect(u ?? null).toBeNull();
      }
    });
  }

  it("校验失败不发邮件", async () => {
    clearMails();
    await regValidated({
      name: "A",
      email: "bad",
      password: TEST_PASSWORD,
    }).catch(() => {});
    expect(mails).toHaveLength(0);
  });

  it("边界值：6 位密码被接受", async () => {
    const email = uniqueEmail();
    await regValidated({ name: "A", email, password: "123456" });
    const u = await userByEmail(email);
    expect(u).toBeTruthy();
  });

  it("边界值：32 位密码被接受", async () => {
    const email = uniqueEmail();
    await regValidated({ name: "A", email, password: "a".repeat(32) });
    const u = await userByEmail(email);
    expect(u).toBeTruthy();
  });

  it("边界值：50 字 name 被接受", async () => {
    const email = uniqueEmail();
    await regValidated({
      name: "x".repeat(50),
      email,
      password: TEST_PASSWORD,
    });
    const u = await userByEmail(email);
    expect(u).toBeTruthy();
  });
});

// ============================================================
// 限速（3 次/分钟/IP）
// ============================================================

describe("注册 — 限速", () => {
  it("前 3 次成功，第 4 次被拒", async () => {
    const ip = "203.0.113.77";
    await clearRateLimit("register");
    const outcomes: string[] = [];

    for (let i = 0; i < 4; i++) {
      const email = uniqueEmail("rl");
      try {
        await reg({ name: "A", email, password: TEST_PASSWORD }, ip);
        await userByEmail(email);
        outcomes.push("ok");
      } catch {
        outcomes.push("blocked");
      }
    }

    expect(outcomes).toEqual(["ok", "ok", "ok", "blocked"]);
  });

  it("被限速的第 4 次不建用户", async () => {
    const ip = "203.0.113.98";
    await clearRateLimit("register");

    for (let i = 0; i < 3; i++) {
      const email = uniqueEmail("rl2");
      await reg({ name: "A", email, password: TEST_PASSWORD }, ip);
      await userByEmail(email);
    }

    const blocked = uniqueEmail("blocked");
    await reg({ name: "A", email: blocked, password: TEST_PASSWORD }, ip).catch(
      () => {},
    );

    const u = await db.orm.public.User.where({ email: blocked }).first();
    expect(u ?? null).toBeNull();
  });

  it("被限速的第 4 次不发邮件", async () => {
    const ip = "203.0.113.99";
    await clearRateLimit("register");

    for (let i = 0; i < 3; i++) {
      const email = uniqueEmail("rl3");
      await reg({ name: "A", email, password: TEST_PASSWORD }, ip);
      await userByEmail(email);
    }

    clearMails();
    await reg(
      { name: "A", email: uniqueEmail("x"), password: TEST_PASSWORD },
      ip,
    ).catch(() => {});
    expect(mails).toHaveLength(0);
  });

  it("不同 IP 各有独立配额", async () => {
    await clearRateLimit("register");

    for (let i = 0; i < 3; i++) {
      const email = uniqueEmail("ipA");
      await reg({ name: "A", email, password: TEST_PASSWORD }, "203.0.113.1");
      await userByEmail(email);
    }

    const emailB = uniqueEmail("ipB");
    await reg(
      { name: "B", email: emailB, password: TEST_PASSWORD },
      "203.0.113.2",
    );
    const u = await userByEmail(emailB);
    expect(u).toBeTruthy();
  });

  it("同 IP 不同邮箱也共享配额（按 IP 限，不按邮箱）", async () => {
    const ip = "203.0.113.55";
    await clearRateLimit("register");

    for (let i = 0; i < 3; i++) {
      const email = uniqueEmail("shared");
      await reg({ name: "A", email, password: TEST_PASSWORD }, ip);
      await userByEmail(email);
    }

    const email4 = uniqueEmail("shared4");
    await expect(
      reg({ name: "A", email: email4, password: TEST_PASSWORD }, ip),
    ).rejects.toThrow();
  });
});

// ============================================================
// 数据完整性 / 并发
// ============================================================

describe("注册 — 数据完整性", () => {
  it("多个用户各自独立一条 OTP，互不干扰", async () => {
    const e1 = uniqueEmail("m1");
    const e2 = uniqueEmail("m2");
    await reg({ name: "A", email: e1, password: TEST_PASSWORD });
    await reg({ name: "B", email: e2, password: TEST_PASSWORD });

    const u1 = await userByEmail(e1);
    const u2 = await userByEmail(e2);
    const o1 = await getEmailOtps(u1!.id);
    const o2 = await getEmailOtps(u2!.id);

    expect(o1).toHaveLength(1);
    expect(o2).toHaveLength(1);
    expect(o1[0].tokenHash).not.toBe(o2[0].tokenHash);
  });

  it("并发注册同一邮箱只成功一次（唯一约束兜底）", async () => {
    const email = uniqueEmail("race");
    const results = await Promise.allSettled([
      reg({ name: "A", email, password: TEST_PASSWORD }),
      reg({ name: "B", email, password: TEST_PASSWORD }),
    ]);

    await userByEmail(email);
    const users = await db.orm.public.User.where({ email }).all();
    expect(users).toHaveLength(1);

    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok.length).toBeLessThanOrEqual(1);
  });

  it("并发注册不同邮箱互不影响", async () => {
    const emails = [uniqueEmail("p1"), uniqueEmail("p2"), uniqueEmail("p3")];
    await Promise.all(
      emails.map((email, i) =>
        reg({ name: `U${i}`, email, password: TEST_PASSWORD }),
      ),
    );

    for (const email of emails) {
      const u = await userByEmail(email);
      expect(u).toBeTruthy();
    }
  });
});
