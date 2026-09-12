import { db } from "#prisma/db";
import { PUBLIC_COLUMNS, type ManagedRole, type User } from "#lib/auth/current-user";
import { hashPassword } from "#lib/auth/password";
import { invalidateAllSessions } from "#lib/auth/session-manager";

export async function listManagedUsers(role: ManagedRole): Promise<User[]> {
  return db.orm.public.User.where((u) => u.role.eq(role))
    .select(...PUBLIC_COLUMNS)
    .orderBy((u) => u.createdAt.desc())
    .all();
}

export async function adminResetPassword(userId: string, newPassword: string): Promise<void> {
  await invalidateAllSessions(userId);

  await db.orm.public.User.where({ id: userId }).update({
    passwordHash: await hashPassword(newPassword),
  });
}
