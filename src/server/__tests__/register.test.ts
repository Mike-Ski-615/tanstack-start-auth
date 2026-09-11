import "#test/mock-server-env";
import { mails, clearMails } from "#test/mock-server-env";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { register } from "#server/register.functions";
import { db } from "#prisma/db";
import {
  uniqueEmail,
  TEST_PASSWORD,
  deleteUser,
  scopedClearRateLimit,
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

const reg = (data: { name: string; email: string; password: string }, ip = IP) =>
  withRequest({ ip }, () => register({ data }));

/**
 * 带 schema 校验的注册调用。
 *
 * 测试直调 serverFn 时 validator 不执行（executeMiddleware 里写的是
 * env === "server" 才校验），所以非法输入会直接进 handler 落库。
 * 要验证「输入校验」就必须显式跑一遍，与生产行为对齐。
 */
const regValidated = (data: { name: string; email: string; password: string }, ip = IP) =>
  callServerFnValidated(register, registerSchema, data, { ip });

beforeEach(async () => {
  clearMails();
  /*
   * 只清**本文件用到的** register 桶，不要清整个 register 维度。
   *
   * 之前写的是 clearRateLimit("register")，会删掉所有 `register%` 的 key ——
   * 包括其它测试文件（如 rate-limit-response.test.ts）用别的 IP 建的桶。
   * 两个文件并行跑时会互相擦除计数，表现为“操作过于频繁”的偶发 429。
   *
   * 必须清两个桶（不是一个）：
   *   register:ip=<IP>   通过 reg()/callServerFnValidated(..., { ip }) 发的
   *   register:          没传 ctx 的调用 —— subjectKey() 跳过 undefined，
   *                      于是 key 里 ip= 段为空（见 rate-limiter 的说明）
   * 只清前者时，后者会在整个文件的用例间累积，跑到第 4 次就炸。
   *
   * 注：本文件内部用到的其它 IP（.77/.98/.99 等）各自在用例里显式清。
   */
  await scopedClearRateLimit(IP, "register");
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
    const devices = await db.orm.public.Device.where((d) => d.userId.eq(u!.id)).all();
    const sessions = await db.orm.public.Session.where((s) => s.userId.eq(u!.id)).all();
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
  /*
   * 核心不变式：重复注册**不报错**，且响应与成功一模一样。
   * 报错就等于给攻击者一个免费的账号枚举接口（拿邮箱列表跑一遍就能
   * 筛出哪些人在这里有账号），注册限速是每 IP 每分钟 3 次，拦不住分布式枚举。
   */
  it("同一邮箱重复注册不报错（防枚举）", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });
    await userByEmail(email);

    // 不 rejects：这是有意为之，不是漏了校验
    await expect(reg({ name: "B", email, password: TEST_PASSWORD })).resolves.not.toThrow();
  });

  it("重复注册的响应与首次注册同形", async () => {
    /*
     * 不用 callServerFnResult 拿返回值：register 的 __executeServer 不把
     * handler 返回值放在 result 上（写接口的返回走响应流，不是返回值 ——
     * 这是 callServerFnResult 文档里就声明了的限制）。
     *
     * 直接调 __executeServer 看它**不报错**，再用数据库与邮件副作用断言：
     * 如果响应形状不同，攻击者能靠字段存在性区分 —— 而形状不同的根源是
     * 走了不同的代码路径，那必然表现为多建了用户 / 发了验证码邮件。
     */
    const email = uniqueEmail();
    // 显式传 { ip }：不传的话 subjectKey() 会跳过 ip，落到 `register:` 这个
    // 空 subject 桶上 —— 与 beforeEach 清的桶不是同一个，会让计数跨用例累积。
    await callServerFnValidated(
      register,
      registerSchema,
      {
        name: "A",
        email,
        password: TEST_PASSWORD,
      },
      { ip: IP },
    );
    await userByEmail(email);

    clearMails();
    // 第二次注册不报错
    await callServerFnValidated(
      register,
      registerSchema,
      {
        name: "B",
        email,
        password: TEST_PASSWORD,
      },
      { ip: IP },
    );

    // 没多建用户
    const users = await db.orm.public.User.where({ email }).all();
    expect(users).toHaveLength(1);

    // 发的是提醒邮件（不是验证码）—— 验证码只在真新建用户时发
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toContain("已注册过");
    expect(mails[0].text).not.toContain("验证码是");
  });

  it("重复注册不产生第二个用户", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });
    await userByEmail(email);

    await reg({ name: "B", email, password: TEST_PASSWORD });

    const users = await db.orm.public.User.where({ email }).all();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("A");
  });

  it("重复注册不动原用户的 OTP", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });
    const u = await userByEmail(email);
    const before = await getEmailOtps(u!.id);

    await reg({ name: "B", email, password: TEST_PASSWORD });

    const after = await getEmailOtps(u!.id);
    expect(after).toHaveLength(before.length);
    expect(after[0].tokenHash).toBe(before[0].tokenHash);
  });

  /*
   * 重复注册**要**发一封邮件，但内容不是验证码而是「你已注册过」。
   *
   * 这封邮件是必需的：不留任何通知的话，忘了自己注册过的用户会卡在
   * 验证码页永远等不到邮件。区分职责由邮件承担（只有邮箱持有者能看），
   * 接口响应保持与成功一致 —— 这正是防枚举的做法。
   */
  it("重复注册发提醒邮件，且不含验证码", async () => {
    const email = uniqueEmail();
    await reg({ name: "A", email, password: TEST_PASSWORD });
    await userByEmail(email);

    clearMails();
    await reg({ name: "B", email, password: TEST_PASSWORD });

    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe(email);
    expect(mails[0].subject).toContain("已注册过");
    // 不发验证码：否则等于泄了个可用的登录凭证
    expect(mails[0].text).not.toContain("验证码是");
  });
});

// ============================================================
// 输入校验
// ============================================================

describe("注册 — 输入校验", () => {
  const cases: Array<[string, { name: string; email: string; password: string }]> = [
    ["邮箱格式非法", { name: "A", email: "not-an-email", password: TEST_PASSWORD }],
    ["邮箱为空", { name: "A", email: "", password: TEST_PASSWORD }],
    ["密码过短（5 位）", { name: "A", email: uniqueEmail(), password: "12345" }],
    ["密码为空", { name: "A", email: uniqueEmail(), password: "" }],
    ["密码过长（33 位）", { name: "A", email: uniqueEmail(), password: "a".repeat(33) }],
    ["name 为空", { name: "", email: uniqueEmail(), password: TEST_PASSWORD }],
    ["name 过长（51 字）", { name: "x".repeat(51), email: uniqueEmail(), password: TEST_PASSWORD }],
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
    await scopedClearRateLimit(ip, "register");
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
    await scopedClearRateLimit(ip, "register");

    for (let i = 0; i < 3; i++) {
      const email = uniqueEmail("rl2");
      await reg({ name: "A", email, password: TEST_PASSWORD }, ip);
      await userByEmail(email);
    }

    const blocked = uniqueEmail("blocked");
    await reg({ name: "A", email: blocked, password: TEST_PASSWORD }, ip).catch(() => {});

    const u = await db.orm.public.User.where({ email: blocked }).first();
    expect(u ?? null).toBeNull();
  });

  it("被限速的第 4 次不发邮件", async () => {
    const ip = "203.0.113.99";
    await scopedClearRateLimit(ip, "register");

    for (let i = 0; i < 3; i++) {
      const email = uniqueEmail("rl3");
      await reg({ name: "A", email, password: TEST_PASSWORD }, ip);
      await userByEmail(email);
    }

    clearMails();
    await reg({ name: "A", email: uniqueEmail("x"), password: TEST_PASSWORD }, ip).catch(() => {});
    expect(mails).toHaveLength(0);
  });

  it("不同 IP 各有独立配额", async () => {
    await scopedClearRateLimit("203.0.113.1", "register");
    await scopedClearRateLimit("203.0.113.2", "register");

    for (let i = 0; i < 3; i++) {
      const email = uniqueEmail("ipA");
      await reg({ name: "A", email, password: TEST_PASSWORD }, "203.0.113.1");
      await userByEmail(email);
    }

    const emailB = uniqueEmail("ipB");
    await reg({ name: "B", email: emailB, password: TEST_PASSWORD }, "203.0.113.2");
    const u = await userByEmail(emailB);
    expect(u).toBeTruthy();
  });

  it("同 IP 不同邮箱也共享配额（按 IP 限，不按邮箱）", async () => {
    const ip = "203.0.113.55";
    await scopedClearRateLimit(ip, "register");

    for (let i = 0; i < 3; i++) {
      const email = uniqueEmail("shared");
      await reg({ name: "A", email, password: TEST_PASSWORD }, ip);
      await userByEmail(email);
    }

    const email4 = uniqueEmail("shared4");
    await expect(reg({ name: "A", email: email4, password: TEST_PASSWORD }, ip)).rejects.toThrow();
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

  it("并发注册同一邮箱只建一个用户（唯一约束兜底）", async () => {
    const email = uniqueEmail("race");
    /*
     * 两个请求同时进来时，两边可能都过了「查重」那道检查（都是未存在），
     * 然后双双尝试 INSERT —— 靠的是数据库唯一约束。
     *
     * 不断言“只有一个 fulfilled”：防枚举后重复注册**不该报错**（返回与成功
     * 同形），所以两个都可能 fulfilled。真正的不变式是数据库里只有一个人，
     * 且不会因此多发一份验证码。
     */
    const results = await Promise.allSettled([
      reg({ name: "A", email, password: TEST_PASSWORD }),
      reg({ name: "B", email, password: TEST_PASSWORD }),
    ]);

    // 至少一个成功；另一个要么也“成功”（撞存后走已存在分支），
    // 要么被唯一约束拦下 —— 两种都不应崩得没边
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);

    const users = await db.orm.public.User.where({ email }).all();
    expect(users).toHaveLength(1);
  });

  it("并发注册不同邮箱互不影响", async () => {
    const emails = [uniqueEmail("p1"), uniqueEmail("p2"), uniqueEmail("p3")];
    await Promise.all(
      emails.map((email, i) => reg({ name: `U${i}`, email, password: TEST_PASSWORD })),
    );

    for (const email of emails) {
      const u = await userByEmail(email);
      expect(u).toBeTruthy();
    }
  });
});
