import { createServerFn } from "@tanstack/react-start";
import { db } from "#prisma/db";

import { registerSchema } from "#schemas/auth";

import { useAppSession } from "#lib/session";
import { hashPassword } from "./password";

/**
 * 注册开户用例（文档模式）：查重 → 建用户 → 写入会话（注册即登录）。
 *
 * 邮箱已占用以返回值携带 error（不抛错）；
 * 并发竞态由数据库唯一约束兜底（违例以错误冒出）。
 */
export const register = createServerFn({
  method: "POST",
})
  .validator(registerSchema)
  .handler(async ({ data: { name, email, password } }) => {
    const existingUser = await db.orm.public.User.where({ email }).first();

    if (existingUser) {
      return { error: "User already exists" };
    }

    const passwordHash = await hashPassword(password);

    const user = await db.orm.public.User.create({
      email,
      name,
      passwordHash,
      image: "/default-user.webp",
      bio: "这个人很懒,什么也没有留下",
    });

    // 创建会话：注册即登录
    const session = await useAppSession();
    await session.update({
      userId: user.id,
      email: user.email,
    });

    return {
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    };
  });
