import { db } from "#prisma/db";
import { MANAGED_ROLES } from "#lib/auth/current-user";
import { ERROR_MESSAGE } from "#lib/error-messages";
import {
  resolveAudience,
  type AudienceCandidate,
  type NotificationTarget,
} from "#lib/notifications/audience";

async function fetchCandidates(target: NotificationTarget): Promise<AudienceCandidate[]> {
  if (target.all) {
    return db.orm.public.User.where((u) => u.role.in([...MANAGED_ROLES]))
      .select("id", "role")
      .all();
  }

  const out = new Map<string, AudienceCandidate>();

  for (const role of target.roles ?? []) {
    const rows = await db.orm.public.User.where((u) => u.role.eq(role))
      .select("id", "role")
      .all();
    for (const row of rows) out.set(row.id, row);
  }

  for (const id of target.userIds ?? []) {
    const row = await db.orm.public.User.where({ id }).select("id", "role").first();
    if (row) out.set(row.id, row);
  }

  return [...out.values()];
}

export async function resolveRecipients(
  target: NotificationTarget,
  senderId: string,
): Promise<string[]> {
  const candidates = await fetchCandidates(target);
  const { recipientIds, overLimit } = resolveAudience(candidates, target, senderId);

  if (overLimit) throw new Error(ERROR_MESSAGE.TOO_MANY_RECIPIENTS);

  return recipientIds;
}

export type CreateNotificationInput = {
  title: string;
  body: string;
  link?: string | null;
  target: NotificationTarget;
  senderId: string;
};

export async function createNotification(
  input: CreateNotificationInput,
): Promise<{ id: string; recipientCount: number }> {
  const recipients = await resolveRecipients(input.target, input.senderId);

  const created = await db.orm.public.Notification.create({
    title: input.title,
    body: input.body,
    ...(input.link ? { link: input.link } : {}),
    createdBy: input.senderId,
  });

  const notificationId = created.id;

  for (const userId of recipients) {
    await db.orm.public.NotificationRecipient.create({
      notificationId,
      userId,
    });
  }

  return { id: notificationId, recipientCount: recipients.length };
}

export type NotificationItem = {
  id: string;
  notificationId: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function listNotificationsForUser(
  userId: string,
  limit = 50,
): Promise<NotificationItem[]> {
  const rows = await db.orm.public.NotificationRecipient.where((r) => r.userId.eq(userId))
    .where((r) => r.deletedAt.isNull())
    .orderBy((r) => r.createdAt.desc())
    .limit(limit)
    .all();

  if (rows.length === 0) return [];

  const notifications = await db.orm.public.Notification.where((n) =>
    n.id.in(rows.map((r) => r.notificationId)),
  ).all();

  const byId = new Map(notifications.map((n) => [n.id, n] as const));

  const items: NotificationItem[] = [];
  for (const r of rows) {
    const n = byId.get(r.notificationId);
    if (!n) continue;
    items.push({
      id: r.id,
      notificationId: n.id,
      title: n.title,
      body: n.body,
      link: n.link ?? null,
      readAt: r.readAt ?? null,
      createdAt: r.createdAt,
    });
  }
  return items;
}

export async function countUnread(userId: string): Promise<number> {
  const rows = await db.orm.public.NotificationRecipient.where((r) => r.userId.eq(userId))
    .where((r) => r.deletedAt.isNull())
    .where((r) => r.readAt.isNull())
    .select("id")
    .all();
  return rows.length;
}

export async function markRead(recipientId: string, userId: string): Promise<boolean> {
  const row = await db.orm.public.NotificationRecipient.where({
    id: recipientId,
  }).first();
  if (!row || row.userId !== userId) return false;
  if (row.readAt) return true;

  await db.orm.public.NotificationRecipient.where({ id: recipientId }).update({
    readAt: new Date().toISOString(),
  });
  return true;
}

export async function markAllRead(userId: string): Promise<number> {
  const unread = await db.orm.public.NotificationRecipient.where((r) => r.userId.eq(userId))
    .where((r) => r.deletedAt.isNull())
    .where((r) => r.readAt.isNull())
    .all();

  const now = new Date().toISOString();
  for (const r of unread) {
    await db.orm.public.NotificationRecipient.where({ id: r.id }).update({
      readAt: now,
    });
  }
  return unread.length;
}

export async function softDeleteForUser(recipientId: string, userId: string): Promise<boolean> {
  const row = await db.orm.public.NotificationRecipient.where({
    id: recipientId,
  }).first();
  if (!row || row.userId !== userId) return false;

  await db.orm.public.NotificationRecipient.where({ id: recipientId }).update({
    deletedAt: new Date().toISOString(),
  });
  return true;
}

export type SentNotification = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  recipientCount: number;
  readCount: number;
};

export async function listSentNotifications(): Promise<SentNotification[]> {
  const batches = await db.orm.public.Notification.orderBy((n) => n.createdAt.desc()).all();

  if (batches.length === 0) return [];

  const rows = await db.orm.public.NotificationRecipient.where((r) =>
    r.notificationId.in(batches.map((n) => n.id)),
  ).all();

  const byBatch = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byBatch.get(r.notificationId) ?? [];
    list.push(r);
    byBatch.set(r.notificationId, list);
  }

  return batches.map((n) => {
    const rs = byBatch.get(n.id) ?? [];
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      link: n.link ?? null,
      createdAt: n.createdAt,
      recipientCount: rs.length,
      readCount: rs.filter((r) => r.readAt != null).length,
    };
  });
}

export async function deleteNotificationBatch(notificationId: string): Promise<boolean> {
  const n = await db.orm.public.Notification.where({
    id: notificationId,
  }).first();
  if (!n) return false;

  await db.orm.public.NotificationRecipient.where((r) =>
    r.notificationId.eq(notificationId),
  ).delete();
  await db.orm.public.Notification.where({ id: notificationId }).delete();
  return true;
}
