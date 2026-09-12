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

export const listNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    return listNotificationsForUser(context.user.id);
  });

export const unreadCountFn = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    return countUnread(context.user.id);
  });

export const markNotificationReadFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(notificationRecipientIdSchema)
  .handler(async ({ data, context }) => {
    return { success: await markRead(data.recipientId, context.user.id) };
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    return { count: await markAllRead(context.user.id) };
  });

export const updateNotificationPrefsFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(notificationPrefsSchema)
  .handler(async ({ data, context }) => {
    await db.orm.public.User.where({ id: context.user.id }).update({
      notifyOnNewMessage: data.notifyOnNewMessage,
    });
    return { success: true };
  });

export const deleteNotificationFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(notificationRecipientIdSchema)
  .handler(async ({ data, context }) => {
    return { success: await softDeleteForUser(data.recipientId, context.user.id) };
  });

export const sendNotificationFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(sendNotificationSchema)
  .handler(async ({ data, context }) => {
    const target = data.all ? { all: true } : { roles: data.roles, userIds: data.userIds };

    const { recipientCount } = await createNotification({
      title: data.title,
      body: data.body,
      link: data.link || null,
      target,
      senderId: context.user.id,
    });

    if (recipientCount === 0) throw new Error(ERROR_MESSAGE.NO_RECIPIENTS);

    return { success: true, recipientCount };
  });

export const listSentNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    return listSentNotifications();
  });

export const deleteNotificationBatchFn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(notificationBatchIdSchema)
  .handler(async ({ data }) => {
    return { success: await deleteNotificationBatch(data.notificationId) };
  });

export const listSelectableUsersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    return listManagedUsersForPicker();
  });

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
