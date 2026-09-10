import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeader,
  getRequestIP,
  setResponseStatus,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { db } from "#prisma/db";
import { emailOnlySchema, resetPasswordSchema } from "#schemas/auth";
import { hashPassword } from "../lib/auth/password";
import { sendMail } from "../lib/auth/mail";
import {
  createAuthenticatedSession,
  createResetOtp,
  verifyResetOtp,
  invalidateAllSessions,
} from "#lib/auth/session-manager";
import { setSessionCookie, setDeviceCookie } from "#lib/auth/session";
import { rateLimit } from "#lib/auth/rate-limiter";

/**
 * 密码重置用例（DB 版）：重置令牌为一枚随机串 { userId, exp }，
 * SHA-256 哈希后落库，15 分钟有效。
 * 与哲学一致：单设备在线，撤销旧会话。
 */

/**
 * 请求密码重置。防枚举：无论邮箱是否存在，恒返回同一响应。
 */
export const requestPasswordResetFn = createServerFn({
  method: "POST",
})
  .validator(emailOnlySchema)
  .handler(async ({ data: { email } }) => {
    setResponseHeader("Cache-Control", "no-store");

    // 速率限制：同一 IP 1 分钟最多 3 次重置请求（防邮件轰炸）
    const ip = getRequestIP();
    const { allowed, resetAt } = await rateLimit("reset", ip);
    if (!allowed) {
      setResponseStatus(429);
      setResponseHeader(
        "Retry-After",
        String(Math.ceil((resetAt - Date.now()) / 1000)),
      );
      throw new Error("Too many requests, please try again later");
    }

    const user = await db.orm.public.User.where({ email }).first();

    if (user) {
      const otp = await createResetOtp(user.id);
      await sendMail(
        email,
        "重置你的密码",
        [
          "你的密码重置验证码是：",
          "",
          `    ${otp}`,
          "",
          "15 分钟内有效。如果你没有发起此请求，可以安全地忽略这封邮件。",
        ].join("\n"),
      );
    }

    return { success: true };
  });

/**
 * 重置密码：校验验证码 → 改密 → 全局失效旧 Session → createAuthenticatedSession。
 */
export const resetPasswordFn = createServerFn({
  method: "POST",
})
  .validator(resetPasswordSchema)
  .handler(async ({ data: { email, otp, password } }) => {
    setResponseHeader("Cache-Control", "no-store");

    // 限速：同一邮箱 + IP 组合 1 分钟最多 10 次
    const ip = getRequestIP();
    const { allowed, resetAt } = await rateLimit(
      "reset-verify",
      `${email}:${ip}`,
    );
    if (!allowed) {
      setResponseStatus(429);
      setResponseHeader(
        "Retry-After",
        String(Math.ceil((resetAt - Date.now()) / 1000)),
      );
      throw new Error("too_many_requests");
    }

    // 防枚举：用户不存在也报同一个验证码错误
    const user = await db.orm.public.User.where({ email }).first();
    if (!user) throw new Error("invalid_otp");

    const result = await verifyResetOtp(user.id, otp);
    if (!result.ok) throw new Error(result.reason);

    const userId = result.userId;

    // fail-closed：先失效所有旧 Session，再改密码
    await invalidateAllSessions(userId);

    await db.orm.public.User.where({ id: userId }).update({
      passwordHash: await hashPassword(password),
    });

    // 创建新 Device + Session（自动登录）
    const { token: sessionToken, deviceKey } = await createAuthenticatedSession({
      userId,
      userAgent: getRequestHeader("user-agent"),
      ip: getRequestIP(),
    });

    setSessionCookie(sessionToken);
    setDeviceCookie(deviceKey);

    return { success: true };
  });
