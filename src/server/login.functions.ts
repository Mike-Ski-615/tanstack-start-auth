// Dummy Argon2 hash 用于用户不存在时的恒定时间校验，防止 timing attack 枚举邮箱。
//
// 必须是 argon2id 真实产出的哈希（参数与 lib/auth/password.ts 一致）。手写伪哈希
// 会让 argon2Verify 直接抛异常而不执行任何计算，用户不存在时从“~220ms + 密码错”
// 变成“0ms + 500”，反而给攻击者一个更清晰的信号。密码不可知，产物无法用于登录。
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=1$0IJWluIg0PQoVokT8IL6Yw$I3uYiR6qTsLLo1pq0jfitvOfAOD/QRz+5EaZ1kiGzos";

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
import {
  setSessionCookie,
  setDeviceCookie,
  getDeviceKey,
} from "#lib/auth/session";
import { rateLimit } from "#lib/auth/rate-limiter";

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
    const ip = getRequestIP();
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

    const { token, deviceKey } = await createAuthenticatedSession(
      {
        userId: user.id,
        deviceKey: existingDeviceKey,
        userAgent: getRequestHeader("user-agent"),
        ip: getRequestIP(),
      },
    );

    setSessionCookie(token);
    setDeviceCookie(deviceKey);

    return { success: true };
  });
