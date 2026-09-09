import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeader,
  getRequestIP,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { db } from "#prisma/db";

import { registerSchema } from "#schemas/auth";

import { hashPassword } from "../lib/auth/password";
import { createSession } from "#lib/auth/session-manager";
import { setSessionCookie } from "#lib/auth/session";

/**
 * 注册开户用例：查重 → 建用户 → 创建会话 → 设 cookie（注册即登录）。
 *
 * 邮箱已占用直接 throw（客户端 onError 据此显示具体提示）；
 * 并发竞态由数据库唯一约束兜底（违例以错误冒出）。
 */
export const register = createServerFn({
  method: "POST",
})
  .validator(registerSchema)
  .handler(async ({ data: { name, email, password } }) => {
    setResponseHeader("Cache-Control", "no-store");

    const existingUser = await db.orm.public.User.where({ email }).first();

    if (existingUser) {
      throw new Error("User already exists");
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
    const token = await createSession({
      userId: user.id,
      userAgent: getRequestHeader("user-agent"),
      ip: getRequestIP(),
    });

    setSessionCookie(token);

    return {
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    };
  });
