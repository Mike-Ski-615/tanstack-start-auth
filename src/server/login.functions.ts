import { createServerFn } from "@tanstack/react-start";

import { db } from "#prisma/db";
import { loginSchema } from "#schemas/auth";

import {
  createSession,
  revokeAllSessions,
  setSessionCookie,
} from "./auth/session";

import { verifyPassword } from "./password";

export const login = createServerFn({
  method: "POST",
})
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const user = await db.orm.public.User.where({
      email: data.email,
    }).first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const passwordValid = await verifyPassword(user.passwordHash, data.password);

    if (!passwordValid) {
      throw new Error("Invalid email or password");
    }

    const token = await db.transaction(async (tx) => {
      await revokeAllSessions(user.id, tx);
      return createSession(user.id, tx);
    });

    setSessionCookie(token);

    return {
      ok: true,
    };
  });
