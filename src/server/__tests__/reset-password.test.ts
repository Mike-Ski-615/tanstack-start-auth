import "#test/mock-server-env";
import { mails, clearMails } from "#test/mock-server-env";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  requestPasswordResetFn,
  resetPasswordFn,
} from "#server/reset.functions";
import { resetPasswordSchema } from "#schemas/auth";
import { MAX_OTP_ATTEMPTS } from "#lib/auth/otp";
import { validateSession } from "#lib/auth/session-manager";
import { db } from "#prisma/db";
import {
  uniqueEmail,
  createUser,
  deleteUser,
  clearRateLimit,
  withRequest,
  callServerFnValidated,
  getResetOtps,
  getSessions,
} from "#test/helpers";

/**
 * 密码重置测试（OTP 版）。
 *
 * 重点：防枚举（无论邮箱是否存在恒成功）、错误次数上限、改密后全局登出、
 * 自动登录、限速。
 */

const created: string[] = [];
const IP = "198.51.100.30";

async function cleanup() {
  for (const id of created.splice(0)) await deleteUser(id);
}

async function userWithResetOtp() {
  const { user, email } = await createUser({ verified: true });
  created.push(user.id);
  const { createResetOtp } = await import("#lib/auth/reset-otp");
  const otp = await createResetOtp(user.id);
  return { user, email, otp };
}

const requestReset = (email: string, ip = IP) =>
  withRequest({ ip }, () => requestPasswordResetFn({ data: { email } }));

const doReset = (
  data: { email: string; otp: string; password: string },
  ip = IP,
) => withRequest({ ip }, () => resetPasswordFn({ data }));

const resetValidated = (
  data: { email: string; otp: string; password: string },
  ip = IP,
) => callServerFnValidated(resetPasswordFn, resetPasswordSchema, data, { ip });

beforeEach(async () => {
  clearMails();
  await clearRateLimit("reset", "reset-verify");
});

afterEach(cleanup);

// ============================================================
// 请求重置（防枚举）
// ============================================================

describe("请求重置 — 防枚举", () => {
  it("已注册邮箱：生成重置 OTP 并发送邮件", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await requestReset(email);

    const otps = await getResetOtps(user.id);
    expect(otps).toHaveLength(1);
    expect(otps[0].usedAt ?? null).toBeNull();
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe(email);
  });

  it("邮件正文含 6 位验证码", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await requestReset(email);

    expect(mails[0].text).toMatch(/^\s{4}\d{6}\s*$/m);
  });

  it("未注册邮箱：不抛错、不发邮件（防枚举）", async () => {
    await expect(requestReset(uniqueEmail("ghost"))).resolves.toBeUndefined();
    expect(mails).toHaveLength(0);
  });

  it("未注册邮箱也返回成功（调用方无法区分）", async () => {
    const r1 = await requestReset(uniqueEmail("ghost1"));
    const r2 = await requestReset(uniqueEmail("ghost2"));
    // 都是 undefined（无异常）即为通过
    expect(r1).toBeUndefined();
    expect(r2).toBeUndefined();
  });

  it("未验证邮箱的用户也能请求重置", async () => {
    const { user, email } = await createUser({ verified: false });
    created.push(user.id);

    await requestReset(email);

    expect(await getResetOtps(user.id)).toHaveLength(1);
  });

  it("重复请求会作废旧 OTP，只留一条可用", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await requestReset(email);
    await requestReset(email);
    await requestReset(email);

    const otps = await getResetOtps(user.id);
    const live = otps.filter((o) => !o.usedAt);
    expect(live).toHaveLength(1);
  });

  it("OTP 有效期为 15 分钟", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);
    await requestReset(email);

    const [otp] = await getResetOtps(user.id);
    const ttl = new Date(otp.expiresAt).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(14 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000);
  });

  it("请求限速：同一 IP 1 分钟最多 3 次", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);
    await clearRateLimit("reset");

    for (let i = 0; i < 3; i++) await requestReset(email, "198.51.100.77");
    await expect(requestReset(email, "198.51.100.77")).rejects.toThrow();
  });

  it("限速按 IP，换 IP 不受影响", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);
    await clearRateLimit("reset");

    for (let i = 0; i < 3; i++) await requestReset(email, "198.51.100.1");
    await expect(requestReset(email, "198.51.100.2")).resolves.toBeUndefined();
  });

  it("被限速时不发邮件", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);
    await clearRateLimit("reset");

    for (let i = 0; i < 3; i++) await requestReset(email, "198.51.100.88");
    clearMails();
    await requestReset(email, "198.51.100.88").catch(() => {});
    expect(mails).toHaveLength(0);
  });
});

// ============================================================
// 执行重置
// ============================================================

describe("执行重置 — 成功", () => {
  it("正确的 OTP 重置密码", async () => {
    const { user, email, otp } = await userWithResetOtp();
    const before = await db.orm.public.User.where({ id: user.id }).first();

    await doReset({ email, otp, password: "brandnew123" });

    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after!.passwordHash).not.toBe(before!.passwordHash);
  });

  it("新密码确实可用", async () => {
    const { user, email, otp } = await userWithResetOtp();

    await doReset({ email, otp, password: "brandnew123" });

    const after = await db.orm.public.User.where({ id: user.id }).first();
    const { verifyPassword } = await import("#lib/auth/password");
    expect(await verifyPassword(after!.passwordHash, "brandnew123")).toBe(true);
  });

  it("OTP 被标记为已使用", async () => {
    const { user, email, otp } = await userWithResetOtp();

    await doReset({ email, otp, password: "brandnew123" });

    const otps = await getResetOtps(user.id);
    expect(otps[0].usedAt).toBeTruthy();
  });

  it("同一 OTP 不能二次使用", async () => {
    const { email, otp } = await userWithResetOtp();

    await doReset({ email, otp, password: "brandnew123" });
    await expect(
      doReset({ email, otp, password: "another123" }),
    ).rejects.toThrow();
  });

  it("成功后建立新会话（自动登录）", async () => {
    const { user, email, otp } = await userWithResetOtp();

    await doReset({ email, otp, password: "brandnew123" });

    expect(await getSessions(user.id)).toHaveLength(1);
  });

  it("成功后旧会话全部失效（sessionVersion 递增）", async () => {
    const { user, email, otp } = await userWithResetOtp();
    const before = user.sessionVersion;

    await doReset({ email, otp, password: "brandnew123" });

    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after!.sessionVersion).toBe(before + 1);
  });

  it("重置前存在的旧会话被踢掉", async () => {
    const { user, email, otp } = await userWithResetOtp();

    // 先建一个「攻击者持有的旧会话」
    const { createAuthenticatedSession } =
      await import("#lib/auth/session-manager");
    const { token: oldToken } = await createAuthenticatedSession({
      userId: user.id,
      userAgent: "attacker",
      ip: "203.0.113.99",
    });
    expect(await validateSession(oldToken)).toBeTruthy();

    await doReset({ email, otp, password: "brandnew123" });

    // 旧 token 必须失效
    expect(await validateSession(oldToken)).toBeNull();
  });
});

describe("执行重置 — 失败", () => {
  it("错误 OTP 抛错且密码不变", async () => {
    const { user, email, otp } = await userWithResetOtp();
    const before = await db.orm.public.User.where({ id: user.id }).first();
    const wrong = otp === "000000" ? "111111" : "000000";

    await expect(
      doReset({ email, otp: wrong, password: "brandnew123" }),
    ).rejects.toThrow();

    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after!.passwordHash).toBe(before!.passwordHash);
  });

  it("错误 OTP 使 attempts 自增", async () => {
    const { user, email, otp } = await userWithResetOtp();
    const wrong = otp === "000000" ? "111111" : "000000";

    await doReset({ email, otp: wrong, password: "x" }).catch(() => {});

    const otps = await getResetOtps(user.id);
    expect(otps[0].attempts).toBe(1);
  });

  it("未注册邮箱抛错（防枚举：与错误验证码同文案）", async () => {
    await expect(
      doReset({
        email: uniqueEmail("nobody"),
        otp: "123456",
        password: "brandnew123",
      }),
    ).rejects.toThrow();
  });

  it("没有 OTP 记录时失败", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await expect(
      doReset({ email, otp: "123456", password: "brandnew123" }),
    ).rejects.toThrow();
    expect(await getSessions(user.id)).toHaveLength(0);
  });

  it("过期 OTP 被拒", async () => {
    const { user, email, otp } = await userWithResetOtp();
    await db.orm.public.ResetToken.where((t) => t.userId.eq(user.id)).update({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    await expect(
      doReset({ email, otp, password: "brandnew123" }),
    ).rejects.toThrow();
  });
});

describe("执行重置 — 错误次数上限", () => {
  it(`连续错 ${MAX_OTP_ATTEMPTS} 次后正确 OTP 也失效`, async () => {
    const { user, email, otp } = await userWithResetOtp();
    const wrong = otp === "000000" ? "111111" : "000000";

    for (let i = 0; i < MAX_OTP_ATTEMPTS; i++) {
      await doReset({ email, otp: wrong, password: "x" }).catch(() => {});
    }

    await expect(
      doReset({ email, otp, password: "brandnew123" }),
    ).rejects.toThrow();

    const after = await db.orm.public.User.where({ id: user.id }).first();
    const { verifyPassword } = await import("#lib/auth/password");
    expect(await verifyPassword(after!.passwordHash, "brandnew123")).toBe(
      false,
    );
  });

  it("上限内错误后正确 OTP 仍可用", async () => {
    const { user, email, otp } = await userWithResetOtp();
    const wrong = otp === "000000" ? "111111" : "000000";

    for (let i = 0; i < MAX_OTP_ATTEMPTS - 1; i++) {
      await doReset({ email, otp: wrong, password: "x" }).catch(() => {});
    }
    await doReset({ email, otp, password: "brandnew123" });

    const after = await db.orm.public.User.where({ id: user.id }).first();
    const { verifyPassword } = await import("#lib/auth/password");
    expect(await verifyPassword(after!.passwordHash, "brandnew123")).toBe(true);
  });
});

// ============================================================
// 输入校验
// ============================================================

describe("执行重置 — 输入校验", () => {
  const bad = ["12345", "1234567", "abcdef", ""];
  for (const otp of bad) {
    it(`OTP="${otp}" 被校验拦下`, async () => {
      await expect(
        resetValidated({
          email: uniqueEmail(),
          otp,
          password: "brandnew123",
        }),
      ).rejects.toThrow();
    });
  }

  it("密码过短被拦下", async () => {
    const { email, otp } = await userWithResetOtp();
    await expect(
      resetValidated({ email, otp, password: "123" }),
    ).rejects.toThrow();
  });

  it("邮箱非法被拦下", async () => {
    await expect(
      resetValidated({ email: "bad", otp: "123456", password: "brandnew123" }),
    ).rejects.toThrow();
  });
});
