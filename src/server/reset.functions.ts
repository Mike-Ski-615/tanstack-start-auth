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
  createResetToken,
  consumeResetToken,
  invalidateAllSessions,
} from "#lib/auth/session-manager";
import { setSessionCookie, setDeviceCookie } from "#lib/auth/session";
import { rateLimit } from "#lib/auth/rate-limiter";
import { kickSession } from "#websocket/routes/ws";

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
    const ip = getRequestIP() ?? "unknown";
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
      const token = await createResetToken(user.id);
      await sendMail(
        email,
        "重置你的密码",
        [
          "点击下面的链接重置你的密码（15 分钟内有效）：",
          "",
          `${process.env.APP_URL}/auth/reset?token=${token}`,
          "",
          "如果你没有发起此请求，可以安全地忽略这封邮件。",
        ].join("\n"),
      );
    }

    return { success: true };
  });

/**
 * 重置密码：验签令牌 → 改密 → 全局失效旧 Session → createAuthenticatedSession。
 */
export const resetPasswordFn = createServerFn({
  method: "POST",
})
  .validator(resetPasswordSchema)
  .handler(async ({ data: { token, password } }) => {
    setResponseHeader("Cache-Control", "no-store");

    const userId = await consumeResetToken(token);
    if (!userId) throw new Error("invalid_token");

    // fail-closed：先失效所有旧 Session，再改密码
    await invalidateAllSessions(userId);

    await db.orm.public.User.where({ id: userId }).update({
      passwordHash: await hashPassword(password),
    });

    // 创建新 Device + Session（自动登录）
    const { token: sessionToken, deviceKey, oldSessionId } = await createAuthenticatedSession({
      userId,
      userAgent: getRequestHeader("user-agent"),
      ip: getRequestIP(),
    });

    setSessionCookie(sessionToken);
    setDeviceCookie(deviceKey);

    // 踢掉旧 Session 的 WebSocket 连接
    if (oldSessionId) {
      kickSession(oldSessionId as unknown as string);
    }

    return { success: true };
  });
