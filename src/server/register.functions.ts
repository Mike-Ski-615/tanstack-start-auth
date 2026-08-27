import { createServerFn } from "@tanstack/react-start";

import { db } from "#prisma/db";
import { registerSchema } from "#schemas/auth";

import { hashPassword } from "./password";

import { createSession, setSessionCookie } from "./auth/session";

export const register = createServerFn({
  method: "POST",
})
  .validator(registerSchema)
  .handler(async ({ data }) => {
    const existingUser = await db.orm.public.User.where({
      email: data.email,
    }).first();

    if (existingUser) {
      throw new Error("Unable to create account");
    }

    const passwordHash = await hashPassword(data.password);

    const { token, user } = await db.transaction(async (tx) => {
      const user = await tx.orm.public.User.create({
        email: data.email,
        name: data.name,
        passwordHash,
        image: "/default-user.webp",
        bio: "这个人很懒,什么也没有留下",
      });

      const token = await createSession(user.id, tx);

      return { token, user };
    });

    setSessionCookie(token);

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  });
