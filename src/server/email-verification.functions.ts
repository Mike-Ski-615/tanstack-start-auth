import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeader,
  getRequestIP,
  setResponseStatus,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { db } from "#prisma/db";
import { emailOnlySchema, verifyEmailSchema } from "#schemas/auth";

import { createAuthenticatedSession } from "#lib/auth/session-manager";
import { kickSession } from "#lib/auth/ws-registry";
import {
  consumeVerificationToken,
  createVerificationToken,
} from "#lib/auth/email-verification";
import { setSessionCookie, setDeviceCookie } from "#lib/auth/session";
import { sendMail } from "#lib/auth/mail";
import { rateLimit } from "#lib/auth/rate-limiter";

/**
 * 验证邮箱：校验 token → 标记 verifiedAt → createAuthenticatedSession（自动登录）。
 *
 * 用户点击邮件中的链接后调用此函数。
 * 验证通过即创建 Session，用户无需再次登录。
 */
export const verifyEmailFn = createServerFn({
  method: "POST",
})
  .validator(verifyEmailSchema)
  .handler(async ({ data: { token } }) => {
    setResponseHeader("Cache-Control", "no-store");

    const userId = await consumeVerificationToken(token);
    if (!userId) throw new Error("invalid_or_expired_token");

    // 验证通过 → 创建 Session（自动登录）
    const {
      token: sessionToken,
      deviceKey,
      oldSessionId,
    } = await createAuthenticatedSession({
      userId,
      userAgent: getRequestHeader("user-agent"),
      ip: getRequestIP(),
    });

    setSessionCookie(sessionToken);
    setDeviceCookie(deviceKey);

    // 踢掉旧 Session 的 WebSocket 连接
    if (oldSessionId) {
      kickSession(oldSessionId);
    }

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
    const { allowed, resetAt } = await rateLimit("resend", `ip:${ip}`);
    if (!allowed) {
      setResponseStatus(429);
      setResponseHeader(
        "Retry-After",
        String(Math.ceil((resetAt - Date.now()) / 1000)),
      );
      throw new Error("Too many requests, please try again later");
    }

    // 限速：同一邮箱 1 分钟最多 1 次
    const { allowed: emailAllowed, resetAt: emailResetAt } = await rateLimit(
      "resend",
      `email:${email}`,
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
      const token = await createVerificationToken(user.id);
      await sendMail(
        email,
        "验证你的邮箱",
        [
          "请点击下面的链接验证你的邮箱（24 小时内有效）：",
          "",
          `${process.env.APP_URL}/auth/verify-email?token=${token}`,
          "",
          "如果你没有注册账号，可以安全地忽略这封邮件。",
        ].join("\n"),
      );
    }

    return { success: true as const };
  });
