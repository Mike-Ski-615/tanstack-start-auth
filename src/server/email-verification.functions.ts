import { createServerFn } from "@tanstack/react-start";
import {
  getRequestIP,
  setResponseStatus,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { db } from "#prisma/db";
import { emailOnlySchema, verifyEmailOtpSchema } from "#schemas/auth";

import { signIn } from "#lib/auth/session-manager";
import {
  createVerificationOtp,
  verifyEmailOtp,
} from "#lib/auth/email-verification";
import { sendMail } from "#lib/auth/mail";
import { rateLimit } from "#lib/auth/rate-limiter";

/**
 * 验证邮箱 OTP：校验验证码 → 标记 verifiedAt → createAuthenticatedSession（自动登录）。
 *
 * 以 email 定位用户而非只传 OTP：6 位数字空间只有 100 万，不同用户可能
 * 撞到同一个值，仅凭 OTP 无法确定验证的是谁。
 * 验证通过即创建 Session，用户无需再次登录。
 */
export const verifyEmailFn = createServerFn({
  method: "POST",
})
  .validator(verifyEmailOtpSchema)
  .handler(async ({ data: { email, otp } }) => {
    setResponseHeader("Cache-Control", "no-store");

    // 限速：同一邮箱 + IP 组合 1 分钟最多 10 次验证尝试。
    // OTP 本身已有 5 次错误上限，这里防的是「不断换 OTP 重试」的轰炸。
    const ip = getRequestIP();
    const { allowed, resetAt } = await rateLimit("verify-otp", { email, ip });
    if (!allowed) {
      setResponseStatus(429);
      setResponseHeader(
        "Retry-After",
        String(Math.ceil((resetAt - Date.now()) / 1000)),
      );
      throw new Error("too_many_requests");
    }

    // 防枚举：用户不存在也返回统一的验证码错误
    const user = await db.orm.public.User.where({ email }).first();
    if (!user) throw new Error("invalid_otp");

    const result = await verifyEmailOtp(user.id, otp);
    if (!result.ok) throw new Error(result.reason);

    // 验证通过 → 自动登录
    await signIn(result.userId);

    return { success: true };
  });

/**
 * 重发验证邮件（无需登录）。
 *
 * 接受 email 而非 session，解决「注册后未登录无法 resend」的矛盾。
 * 防枚举：无论邮箱是否存在，恒返回成功。
 * 防轰炸：IP + email 双维度限速。
 */
export const resendVerificationEmailFn = createServerFn({
  method: "POST",
})
  .validator(emailOnlySchema)
  .handler(async ({ data: { email } }) => {
    setResponseHeader("Cache-Control", "no-store");

    // 限速：同一 IP 1 分钟最多 3 次
    const ip = getRequestIP();
    const { allowed, resetAt } = await rateLimit("resend", { ip });
    if (!allowed) {
      setResponseStatus(429);
      setResponseHeader(
        "Retry-After",
        String(Math.ceil((resetAt - Date.now()) / 1000)),
      );
      throw new Error("Too many requests, please try again later");
    }

    // 限速：同一邮箱 3 次/分钟（上限取自 LIMITS.resend，与 IP 维度共用）
    const { allowed: emailAllowed, resetAt: emailResetAt } = await rateLimit(
      "resend",
      { email },
    );
    if (!emailAllowed) {
      setResponseStatus(429);
      setResponseHeader(
        "Retry-After",
        String(Math.ceil((emailResetAt - Date.now()) / 1000)),
      );
      throw new Error("Too many requests, please try again later");
    }

    const user = await db.orm.public.User.where({ email }).first();

    // 防枚举：用户存在且未验证才发邮件
    if (user && !user.emailVerifiedAt) {
      const otp = await createVerificationOtp(user.id);
      await sendMail(
        email,
        "验证你的邮箱",
        [
          "你的邮箱验证码是：",
          "",
          `    ${otp}`,
          "",
          "15 分钟内有效。如果你没有注册账号，可以安全地忽略这封邮件。",
        ].join("\n"),
      );
    }

    return { success: true as const };
  });
