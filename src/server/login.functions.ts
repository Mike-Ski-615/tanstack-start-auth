import { createServerFn } from "@tanstack/react-start";
import { db } from "#prisma/db";
import { loginSchema } from "#schemas/auth";
import { useAppSession } from "#lib/session";
import { verifyPassword } from "./password";

/**
 * 登录用例（文档模式）：校验凭据 → 写入会话 → 返回成功。
 *
 * 凭据失败一律 throw（用户不存在与密码错误抛同一文案），防账号枚举；
 * 成功仅返回值，客户端在 onSuccess 中自行导航。
 */
export const login = createServerFn({
  method: "POST",
})
  .validator(loginSchema)
  .handler(async ({ data: { email, password } }) => {
    const user = await db.orm.public.User.where({ email }).first();

    const valid = user && (await verifyPassword(user.passwordHash, password));

    // 防枚举：用户不存在与密码错误抛出同一文案，客户端只显示笼统提示
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    // 创建会话：userId 与 email 加密进 cookie
    const session = await useAppSession();

    await session.update({
      userId: user.id,
    });

    // 成功仅返回值，由客户端 onSuccess 导航（目标来自 search.redirect）
    return { success: true };
  });
