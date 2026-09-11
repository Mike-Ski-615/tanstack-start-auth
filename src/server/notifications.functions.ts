/**
 * 通知接口。
 *
 * 分两组：
 *   - 管理侧（发送 / 列出已发 / 撤回）—— 每个 handler 都挂 `.middleware([requireAdmin])`
 *   - 用户侧（列表 / 未读数 / 已读 / 全部已读 / 删除）—— 每个 handler 都挂
 *     `.middleware([requireUser])`，只认自己的会话
 *
 * 用户侧的所有操作都从 `context.user` 取 id 再带进查询条件，绝不接受
 * 「你要操作哪一行属于谁」这种参数 —— 只凭 recipientId 就能改别人那条
 * 是权限漏洞。
 *
 * 鉴权从「handler 第一行 await 一个守卫」换成中间件：漏挂就读不到
 * `context.user`，编译不过（见 #lib/auth/middleware.ts）。
 */

import { createServerFn } from "@tanstack/react-start";
import {
  notificationBatchIdSchema,
  notificationPrefsSchema,
  notificationRecipientIdSchema,
  sendNotificationSchema,
} from "#schemas/auth";
import { db } from "#prisma/db";
import { MANAGED_ROLES } from "#lib/auth/current-user";
import { requireAdmin, requireUser } from "#lib/auth/middleware";
import { listManagedUsers } from "#lib/auth/admin-actions";
import { ERROR_MESSAGE } from "#lib/error-messages";
import {
  countUnread,
  createNotification,
  deleteNotificationBatch,
  listNotificationsForUser,
  listSentNotifications,
  markAllRead,
  markRead,
  softDeleteForUser,
} from "#lib/notifications";

// ============================================================
// 用户侧
// ============================================================

/** 当前用户的通知列表。 */
export const listNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    return listNotificationsForUser(context.user.id);
  });

/** 未读数（铃铛徽章，30s 轮询）。 */
export const unreadCountFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    return countUnread(context.user.id);
  });

/** 标记单条已读。 */
export const markNotificationReadFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(notificationRecipientIdSchema)
  .handler(async ({ data, context }) => {
    return { success: await markRead(data.recipientId, context.user.id) };
  });

/** 全部标记已读。 */
export const markAllNotificationsReadFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    return { count: await markAllRead(context.user.id) };
  });

/**
 * 更新自己的通知偏好。
 *
 * 只认会话里的 userId —— 不接受「改哪个用户」的参数，否则就成了改别人的设置。
 */
export const updateNotificationPrefsFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(notificationPrefsSchema)
  .handler(async ({ data, context }) => {
    await db.orm.public.User.where({ id: context.user.id }).update({
      notifyOnNewMessage: data.notifyOnNewMessage,
    });
    return { success: true };
  });

/** 删除（软删）自己的一条通知。 */
export const deleteNotificationFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(notificationRecipientIdSchema)
  .handler(async ({ data, context }) => {
    return { success: await softDeleteForUser(data.recipientId, context.user.id) };
  });

// ============================================================
// 管理侧
// ============================================================

/** 发送通知。 */
export const sendNotificationFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(sendNotificationSchema)
  .handler(async ({ data, context }) => {
    // 勾了「全体」时忽略另外两项 —— 前端会禁用它们，这里兜一道：
    // 否则「全体 + 指定人」会走 resolveRecipients 的 all 分支，静默丢弃指定项。
    const target = data.all ? { all: true } : { roles: data.roles, userIds: data.userIds };

    const { recipientCount } = await createNotification({
      title: data.title,
      body: data.body,
      link: data.link || null,
      target,
      senderId: context.user.id,
    });

    // 一个收件人都没有（比如选了空角色）也算失败，免得管理员以为发出去了
    if (recipientCount === 0) throw new Error(ERROR_MESSAGE.NO_RECIPIENTS);

    return { success: true, recipientCount };
  });

/** 列出已发出的通知（含收件数与已读数）。 */
export const listSentNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    return listSentNotifications();
  });

/** 撤回一条通知。 */
export const deleteNotificationBatchFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(notificationBatchIdSchema)
  .handler(async ({ data }) => {
    return { success: await deleteNotificationBatch(data.notificationId) };
  });

/** 供发送页的用户选择器用：列出可选的师生。 */
export const listSelectableUsersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    return listManagedUsersForPicker();
  });

/** 供选择器用的精简形态（只给发通知时挑人看，不暴露多余字段）。
 *
 * role 取自已查询的角色（不是行里的 u.role）：两者必然相等，而后者是更宽的
 * Role，会让调用方的 .includes() 报错、逼出一个 as 断言。
 */
async function listManagedUsersForPicker() {
  const lists = await Promise.all(
    MANAGED_ROLES.map(async (role) => {
      const users = await listManagedUsers(role);
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role,
      }));
    }),
  );
  return lists.flat();
}
