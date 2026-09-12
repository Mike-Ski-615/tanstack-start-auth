import { createServerFn } from "@tanstack/react-start";
import { db } from "#prisma/db";
import { verifyPassword } from "#lib/auth/password";
import { rotatePassword } from "#lib/auth/password-rotation";
import { changePasswordSchema, updateProfileSchema } from "#schemas/auth";
import { requireUser, withUser } from "#lib/auth/middleware";
import { ERROR_MESSAGE } from "#lib/error-messages";

export const updateProfileFn = createServerFn({
  method: "POST",
})
  .middleware([requireUser])
  .validator(updateProfileSchema)
  .handler(async ({ data: { name, bio }, context }) => {
    await db.orm.public.User.where({ id: context.user.id }).update({
      name,
      bio,
    });

    return { success: true as const };
  });

export const changePasswordFn = createServerFn({
  method: "POST",
})
  .middleware([withUser])
  .validator(changePasswordSchema)
  .handler(async ({ data: { currentPassword, newPassword }, context }) => {
    const user = context.user;
    if (!user) throw new Error(ERROR_MESSAGE.WRONG_PASSWORD);

    const fullUser = await db.orm.public.User.where({ id: user.id }).first();
    const ok = fullUser && (await verifyPassword(fullUser.passwordHash, currentPassword));

    if (!ok) throw new Error(ERROR_MESSAGE.WRONG_PASSWORD);

    await rotatePassword(user.id, newPassword);

    return { success: true as const };
  });
