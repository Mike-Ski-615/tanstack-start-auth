import { db } from "#prisma/db";
import { hashPassword } from "#lib/auth/password";
import { invalidateAllSessions, signIn } from "#lib/auth/session-manager";

export async function rotatePassword(userId: string, newPassword: string): Promise<void> {
  await invalidateAllSessions(userId);

  await db.orm.public.User.where({ id: userId }).update({
    passwordHash: await hashPassword(newPassword),
  });

  await signIn(userId);
}
