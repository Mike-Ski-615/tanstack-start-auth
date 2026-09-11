/**
 * 管理员接口：列表 + 对师生账号的操作。
 *
 * **每个 handler 的第一行都是 requireAdmin()** —— 这是全项目第一处基于
 * role 的服务端校验。前端隐藏菜单不算访问控制：接口一旦漏了这道检查，
 * 学生直接 POST 就能拿到全部用户邮箱、改任何人角色、删任何人账号。
 *
 * 目标限制：这些接口只作用于 student / teacher。管理员账号既不出现在
 * 列表里，也不接受这些操作 —— 由 requireTargetIsManaged() 强制。
 */

import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import {
  adminResetPasswordSchema,
  adminSetRoleSchema,
  adminUpdateProfileSchema,
  userIdSchema,
} from "#schemas/auth";
import { ERROR_MESSAGE } from "#lib/error-messages";
import { db } from "#prisma/db";
import { isManagedRole, PUBLIC_COLUMNS } from "#lib/auth/current-user";
import { requireAdmin } from "#lib/auth/admin-guard";
import { adminResetPassword, listManagedUsers } from "#lib/auth/admin-actions";
import { invalidateAllSessions } from "#lib/auth/session-manager";

/**
 * 错误文案（用户可读）。
 *
 * 直接来自共享常量而非本地错误码：按 react-query 的约定，服务端抛出的
 * error.message 会被界面直接展示，所以它必须是句子而不是机器码。
 * 详见 lib/error-messages.ts 的说明。
 */
const NOT_FOUND = ERROR_MESSAGE.NOT_FOUND;
const CANNOT_TARGET_SELF = ERROR_MESSAGE.CANNOT_TARGET_SELF;

/**
 * 取出目标用户，并确认它是可管理的角色。
 *
 * 三重排除：
 * - 不存在 → not_found
 * - 是 admin → not_found（视为不存在，不暴露「这里有管理员」）
 * - 是自己 → cannot_target_self（防止管理员把自己降级/删除后失去管理权）
 */
async function requireManageableTarget(targetId: string, adminId: string) {
  if (targetId === adminId) throw new Error(CANNOT_TARGET_SELF);

  const target = await db.orm.public.User.where({ id: targetId })
    .select(...PUBLIC_COLUMNS)
    .first();

  // 管理员不可被操作，视同不存在 —— 不区分「没有这个人」和「这是管理员」。
  // 用 isManagedRole 而非本地 .includes()：受管角色是词汇表的一部分，
  // 住在一个 module 里（#lib/auth/current-user）。
  if (!target || !isManagedRole(target.role)) {
    throw new Error(NOT_FOUND);
  }

  return target;
}

// ============================================================
// 列表
// ============================================================

/**
 * 列出某个可管理角色的全部用户。
 *
 * 排序放在服务端（按注册时间倒序），前端表格的排序是客户端行为。
 */
export const listUsersByRoleFn = createServerFn({ method: "GET" })
  .validator(adminSetRoleSchema.pick({ role: true }))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    await requireAdmin();

    return listManagedUsers(data.role);
  });

// ============================================================
// 写操作
// ============================================================

/** 改角色（学生 ↔ 教师）。 */
export const adminSetUserRoleFn = createServerFn({ method: "POST" })
  .validator(adminSetRoleSchema)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    await requireManageableTarget(data.userId, admin.id);

    await db.orm.public.User.where({ id: data.userId }).update({
      role: data.role,
    });

    // 角色变了，工作台也变了 —— 踢掉旧会话，让他重新登录落到新工作台。
    await invalidateAllSessions(data.userId);

    return { success: true };
  });

/**
 * 踢下线：只失效会话，不改任何资料。
 *
 * 与改角色/改密不同，这是纯会话操作 —— 用户重新登录即恢复原状。
 */
export const adminKickUserFn = createServerFn({ method: "POST" })
  .validator(userIdSchema)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    await requireManageableTarget(data.userId, admin.id);

    await invalidateAllSessions(data.userId);

    return { success: true };
  });

/** 重置他人密码。会自动踢下线（adminResetPassword 内部做了）。 */
export const adminResetUserPasswordFn = createServerFn({ method: "POST" })
  .validator(adminResetPasswordSchema)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    await requireManageableTarget(data.userId, admin.id);

    await adminResetPassword(data.userId, data.password);

    return { success: true };
  });

/** 改资料（姓名 / 简介）。 */
export const adminUpdateUserProfileFn = createServerFn({ method: "POST" })
  .validator(adminUpdateProfileSchema)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    await requireManageableTarget(data.userId, admin.id);

    await db.orm.public.User.where({ id: data.userId }).update({
      name: data.name,
      bio: data.bio,
    });

    return { success: true };
  });

/**
 * 删除用户（硬删，级联清掉 Session 与 Device）。
 *
 * 顺序有讲究：先删子表再删 User。没有多语句 transaction 的前提下，
 * 若先删 User 会在外键上失败（子行还在），而那次失败不会留下半删状态。
 * 反过来先清子行、再删 User 时若中途失败，用户会变成「没有任何会话、
 * 但仍存在」—— 这是可接受的中间态（他登不进去，可以重来一次）。
 */
export const adminDeleteUserFn = createServerFn({ method: "POST" })
  .validator(userIdSchema)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    await requireManageableTarget(data.userId, admin.id);

    await db.orm.public.Session.where((s) => s.userId.eq(data.userId)).delete();
    await db.orm.public.Device.where((d) => d.userId.eq(data.userId)).delete();
    await db.orm.public.User.where({ id: data.userId }).delete();

    return { success: true };
  });
