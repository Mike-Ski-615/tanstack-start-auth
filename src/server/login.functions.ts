import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { db } from "#prisma/db";
import { loginSchema } from "#schemas/auth";
import { useAppSession } from "#lib/session";
import { verifyPassword } from "./password";

/**
 * 登录用例（文档模式）：校验凭据 → 写入会话 → 重定向到受保护区。
 *
 * 凭据失败以返回值携带 error（不抛错），防账号枚举：
 * 用户不存在与密码错误返回同一错误文案。
 */
export const login = createServerFn({
  method: "POST",
})
  .validator(loginSchema)
  .handler(async ({ data: { email, password } }) => {
    const user = await db.orm.public.User.where({ email }).first();

    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      return { error: "Invalid email or password" };
    }

    // 创建会话：userId 与 email 加密进 cookie
    const session = await useAppSession();
    await session.update({
      userId: user.id,
      email: user.email,
    });

    // 重定向到受保护区（客户端 RPC 会将此 redirect 抛回调用方）
    throw redirect({ to: "/dashboard" });
  });
