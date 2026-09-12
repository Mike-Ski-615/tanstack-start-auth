import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import {
  adminResetPasswordSchema,
  adminSetRoleSchema,
  adminUpdateProfileSchema,
  userIdSchema,
} from "#schemas/auth";
import { ERROR_MESSAGE } from "#lib/error-messages";
import { db } from "#prisma/db";
import { isManagedRole, PUBLIC_COLUMNS } from "#lib/auth/current-user";
import { requireAdmin } from "#lib/auth/middleware";
import { adminResetPassword, listManagedUsers } from "#lib/auth/admin-actions";
import { invalidateAllSessions } from "#lib/auth/session-manager";

const NOT_FOUND = ERROR_MESSAGE.NOT_FOUND;
const CANNOT_TARGET_SELF = ERROR_MESSAGE.CANNOT_TARGET_SELF;

async function requireManageableTarget(targetId: string, adminId: string) {
  if (targetId === adminId) throw new Error(CANNOT_TARGET_SELF);

  const target = await db.orm.public.User.where({ id: targetId })
    .select(...PUBLIC_COLUMNS)
    .first();

  if (!target || !isManagedRole(target.role)) {
    throw new Error(NOT_FOUND);
  }

  return target;
}

export const listUsersByRoleFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator(v.pick(adminSetRoleSchema, ["role"]))
  .handler(async ({ data }) => {
    return listManagedUsers(data.role);
  });

export const adminSetUserRoleFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(adminSetRoleSchema)
  .handler(async ({ data, context }) => {
    await requireManageableTarget(data.userId, context.user.id);

    await db.orm.public.User.where({ id: data.userId }).update({
      role: data.role,
    });

    await invalidateAllSessions(data.userId);

    return { success: true };
  });

export const adminKickUserFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(userIdSchema)
  .handler(async ({ data, context }) => {
    await requireManageableTarget(data.userId, context.user.id);

    await invalidateAllSessions(data.userId);

    return { success: true };
  });

export const adminResetUserPasswordFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(adminResetPasswordSchema)
  .handler(async ({ data, context }) => {
    await requireManageableTarget(data.userId, context.user.id);

    await adminResetPassword(data.userId, data.password);

    return { success: true };
  });

export const adminUpdateUserProfileFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(adminUpdateProfileSchema)
  .handler(async ({ data, context }) => {
    await requireManageableTarget(data.userId, context.user.id);

    await db.orm.public.User.where({ id: data.userId }).update({
      name: data.name,
      bio: data.bio,
    });

    return { success: true };
  });

export const adminDeleteUserFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(userIdSchema)
  .handler(async ({ data, context }) => {
    await requireManageableTarget(data.userId, context.user.id);

    await db.orm.public.Session.where((s) => s.userId.eq(data.userId)).delete();
    await db.orm.public.Device.where((d) => d.userId.eq(data.userId)).delete();
    await db.orm.public.User.where({ id: data.userId }).delete();

    return { success: true };
  });
