import { createServerFn } from "@tanstack/react-start";
import { db } from "#prisma/db";

import { loginSchema } from "#schemas/auth";

import { issueSession } from "./auth/session";
import { verifyPassword } from "./password";

/**
 * 登录用例：校验凭据，成功即签发 Session（签发即顶替）。
 */
export const login = createServerFn({
  method: "POST",
})
  .validator(loginSchema)
  .handler(async ({ data: { email, password } }) => {
    const user = await db.orm.public.User.where({ email }).first();

    // 防账号枚举：两种失败抛同一错误
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      throw new Error("Invalid email or password");
    }

    await issueSession(user.id);

    return {
      ok: true,
    };
  });
