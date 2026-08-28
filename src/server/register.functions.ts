import { createServerFn } from "@tanstack/react-start";
import { db } from "#prisma/db";

import { registerSchema } from "#schemas/auth";

import { issueSession } from "./auth/session";
import { hashPassword } from "./password";

/**
 * 注册开户用例：创建 User 并即登录（注册即登录）。
 *
 * 建用户与签发 Session 同事务：要么一起落地，要么一起回滚。
 * 签发即顶替在此无实际效果（新用户没有旧会话），但语义统一。
 *
 * 策略：先查重，邮箱已占用即抛错；并发竞态由数据库唯一约束兜底
 * （违例以错误冒出，数据完整性不受影响）。
 */
export const register = createServerFn({
  method: "POST",
})
  .validator(registerSchema)
  .handler(async ({ data: { name, email, password } }) => {
    const existingUser = await db.orm.public.User.where({ email }).first();

    if (existingUser) {
      throw new Error("Unable to create account");
    }

    const passwordHash = await hashPassword(password);

    const user = await db.transaction(async (tx) => {
      const user = await tx.orm.public.User.create({
        email,
        name,
        passwordHash,
        image: "/default-user.webp",
        bio: "这个人很懒,什么也没有留下",
      });

      await issueSession(user.id, tx);

      return user;
    });

    return {
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    };
  });
