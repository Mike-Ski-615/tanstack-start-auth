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
import { createSession } from "#lib/auth/session-manager";
import { setSessionCookie } from "#lib/auth/session";
import { rateLimit } from "#lib/auth/rate-limiter";

/**
 * 登录用例：校验凭据 → 创建会话 → 设 cookie → 返回成功。
 *
 * 凭据失败一律 throw（用户不存在与密码错误抛同一文案），防账号枚举；
 * createSession 内部自动撤销该用户所有旧会话，保证单设备在线。
 */
export const login = createServerFn({
  method: "POST",
})
  .validator(loginSchema)
  .handler(async ({ data: { email, password } }) => {
    setResponseHeader("Cache-Control", "no-store");

    // 速率限制：同一邮箱 + IP 组合 1 分钟最多 5 次
    const { allowed, resetAt } = await rateLimit("login", `${email}:${getRequestIP() ?? "unknown"}`);
    if (!allowed) {
      setResponseStatus(429);
      setResponseHeader(
        "Retry-After",
        String(Math.ceil((resetAt - Date.now()) / 1000)),
      );
      throw new Error("Too many attempts, please try again later");
    }

    const user = await db.orm.public.User.where({ email }).first();

    const valid = user && (await verifyPassword(user.passwordHash, password));

    // 防枚举：用户不存在与密码错误抛出同一文案，客户端只显示笼统提示
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    const token = await createSession({
      userId: user.id,
      userAgent: getRequestHeader("user-agent"),
      ip: getRequestIP(),
    });

    setSessionCookie(token);

    return { success: true };
  });
