const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=1$0IJWluIg0PQoVokT8IL6Yw$I3uYiR6qTsLLo1pq0jfitvOfAOD/QRz+5EaZ1kiGzos";

import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { db } from "#prisma/db";
import { loginSchema } from "#schemas/auth";
import { verifyPassword } from "#lib/auth/password";
import { signIn } from "#lib/auth/session-manager";
import { enforceRateLimit } from "#lib/auth/rate-limiter";
import { ERROR_MESSAGE } from "#lib/error-messages";

export const login = createServerFn({
  method: "POST",
})
  .validator(loginSchema)
  .handler(async ({ data: { email, password } }) => {
    const ip = getRequestIP();
    await enforceRateLimit("login", { email, ip });

    const user = await db.orm.public.User.where({ email }).first();

    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const valid = await verifyPassword(passwordHash, password);

    if (!user || !valid) {
      throw new Error(ERROR_MESSAGE.INVALID_CREDENTIALS);
    }

    await signIn(user.id);

    return { success: true };
  });
