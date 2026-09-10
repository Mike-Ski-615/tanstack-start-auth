// Dummy Argon2 hash 用于用户不存在时的恒定时间校验，防止 timing attack 枚举邮箱
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy";

import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeader,
  getRequestIP,
  setResponseStatus,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { db } from "#prisma/db";
import { loginSchema } from "#schemas/auth";
import { verifyPassword } from "#lib/auth/password";
import { createAuthenticatedSession } from "#lib/auth/session-manager";
import { setSessionCookie, setDeviceCookie, getDeviceKey } from "#lib/auth/session";
import { rateLimit } from "#lib/auth/rate-limiter";
import { kickSession } from "#lib/auth/ws-registry";

/**
 * 登录用例：校验凭据 → createAuthenticatedSession → 设 cookie。
 *
 * 凭据失败一律 throw（用户不存在与密码错误抛同一文案），防账号枚举；
 * createAuthenticatedSession 内部自动处理单设备冲突。
 */
export const login = createServerFn({
  method: "POST",
})
  .validator(loginSchema)
  .handler(async ({ data: { email, password } }) => {
    setResponseHeader("Cache-Control", "no-store");

    // 速率限制：同一邮箱 + IP 组合 1 分钟最多 5 次
    const ip = getRequestIP() ?? "unknown";
    const { allowed, resetAt } = await rateLimit("login", `${email}:${ip}`);
    if (!allowed) {
      setResponseStatus(429);
      setResponseHeader(
        "Retry-After",
        String(Math.ceil((resetAt - Date.now()) / 1000)),
      );
      throw new Error("Too many attempts, please try again later");
    }

    const user = await db.orm.public.User.where({ email }).first();

    // 防枚举：即使用户不存在也执行 Argon2 verify，消除 timing leak
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const valid = await verifyPassword(passwordHash, password);

    if (!user || !valid) {
      throw new Error("Invalid email or password");
    }

    // 读取 cookie 中的 deviceKey（同设备复用）
    const existingDeviceKey = getDeviceKey();

    const { token, deviceKey, oldSessionId } = await createAuthenticatedSession({
      userId: user.id,
      deviceKey: existingDeviceKey,
      userAgent: getRequestHeader("user-agent"),
      ip: getRequestIP(),
    });

    setSessionCookie(token);
    setDeviceCookie(deviceKey);

    // 踢掉旧 Session 的 WebSocket 连接（单设备登录）
    if (oldSessionId) {
      kickSession(oldSessionId);
    }

    return { success: true };
  });
