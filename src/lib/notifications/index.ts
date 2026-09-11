/**
 * 通知：查询与创建。
 *
 * 认证模块之外的第一个业务模块。分层同 admin-actions：**查询/写入放这里
 * 当普通函数**，serverFn 只做鉴权与转发 —— 因为 serverFn 的返回值在测试里
 * 拿不到（见 src/test/request.ts 的说明），而通知的列表/未读数必须断言。
 *
 * 数据模型是两层：
 *   Notification            管理员发出的一次（批次）
 *   NotificationRecipient   一条通知 × 一个收件人（已读/删除状态在这里）
 *
 * 「撤回一条通知」以批次为单位，「删除一条通知」对用户只影响自己那份。
 */

import { db } from "#prisma/db";
import { isManagedRole, MANAGED_ROLES, type ManagedRole } from "#lib/auth/current-user";
import { ERROR_MESSAGE } from "#lib/error-messages";

/** 单次发送的收件人上限。防手滑给几万人建行（每人一行）。 */
export const MAX_RECIPIENTS = 5000;

// ============================================================
// 收件人解析
// ============================================================

/** 选择发送目标的方式。三者可混用（前提是没勾 all）。 */
export type NotificationTarget = {
  /** 发给全部师生。勾了它，下面两项忽略。 */
  all?: boolean;
  /** 按角色。 */
  roles?: ManagedRole[];
  /** 指定若干用户。 */
  userIds?: string[];
};

/**
 * 把发送目标解析成去重后的收件人 id 列表。
 *
 * 规则：
 * - admin 永远不是受众（无论哪种方式都不会命中 —— 角色过滤天然排除，
 *   指定 id 也会被下面的白名单校验剔除）
 * - 排除发送者自己（即便他当前是 student/teacher —— 角色被改过的情况）
 * - 三路结果取并集后去重
 * - 超出 MAX_RECIPIENTS 直接抛错，不静默截断（宁可让管理员分批发）
 */
export async function resolveRecipients(
  target: NotificationTarget,
  senderId: string,
): Promise<string[]> {
  const ids = new Set<string>();

  if (target.all) {
    const everyone = await db.orm.public.User.where((u) => u.role.in([...MANAGED_ROLES]))
      .select("id")
      .all();
    for (const u of everyone) ids.add(u.id);
  } else {
    for (const role of target.roles ?? []) {
      // 只接受受管角色 —— 传 "admin" 也不会命中
      if (!isManagedRole(role)) continue;
      const byRole = await db.orm.public.User.where((u) => u.role.eq(role))
        .select("id")
        .all();
      for (const u of byRole) ids.add(u.id);
    }

    if (target.userIds?.length) {
      // 逐个确认是受管角色：不能让 admin 混进来，也不能靠前端限制
      for (const id of target.userIds) {
        const u = await db.orm.public.User.where({ id }).select("id", "role").first();
        if (!u) continue;
        if (!isManagedRole(u.role)) continue;
        ids.add(u.id);
      }
    }
  }

  // 发送者自己不收自己的通知
  ids.delete(senderId);

  if (ids.size === 0) return [];
  if (ids.size > MAX_RECIPIENTS) {
    throw new Error(ERROR_MESSAGE.TOO_MANY_RECIPIENTS);
  }

  return [...ids];
}

// ============================================================
// 创建
// ============================================================

export type CreateNotificationInput = {
  title: string;
  body: string;
  link?: string | null;
  target: NotificationTarget;
  senderId: string;
};

/**
 * 创建一条通知并展开成收件人行。
 *
 * 没有多语句事务（见 CONTEXT.md 的 Fail-Closed 顺序），所以顺序设计成：
 * 先建批次、再批量建收件行。若后者中途失败，结果是「一条没人收到的通知」
 * —— 干净的空记录，管理员看得见并能删掉；反过来先建收件行则会出现
 * 「收件人指向不存在的通知」。
 */
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

  // 逐条插入。收件人已限流到 MAX_RECIPIENTS，且个人通知场景不会到那个量级；
  // 真要一次发几千人再考虑批量插入。
  for (const userId of recipients) {
    await db.orm.public.NotificationRecipient.create({
      notificationId,
      userId,
    });
  }

  return { id: notificationId, recipientCount: recipients.length };
}

// ============================================================
// 查询（用户侧）
// ============================================================

/** 一条通知在用户列表里的形态。 */
export type NotificationItem = {
  /** 收件人行 id —— 用户操作（已读/删除）用它，不是批次 id。 */
  id: string;
  notificationId: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

/** 当前用户的通知列表（未删的，按时间倒序）。 */
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

  // 一次取回所有关联批次，再按 id 建索引 —— 避免逐行查批次的 N+1。
  const notifications = await db.orm.public.Notification.where((n) =>
    n.id.in(rows.map((r) => r.notificationId)),
  ).all();

  const byId = new Map(notifications.map((n) => [n.id, n] as const));

  const items: NotificationItem[] = [];
  for (const r of rows) {
    const n = byId.get(r.notificationId);
    // 批次被管理员撤回（cascade 删掉了收件行）时不会走到这里，
    // 但防御一下：跳过孤儿行而不是抛错。
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

/** 未读数（铃铛徽章）。 */
export async function countUnread(userId: string): Promise<number> {
  const rows = await db.orm.public.NotificationRecipient.where((r) => r.userId.eq(userId))
    .where((r) => r.deletedAt.isNull())
    .where((r) => r.readAt.isNull())
    .select("id")
    .all();
  return rows.length;
}

// ============================================================
// 用户操作
// ============================================================

/**
 * 标记已读。
 *
 * 必须带 userId 条件 —— 只凭收件行 id 就能改别人那条是权限漏洞。
 */
export async function markRead(recipientId: string, userId: string): Promise<boolean> {
  const row = await db.orm.public.NotificationRecipient.where({
    id: recipientId,
  }).first();
  if (!row || row.userId !== userId) return false;
  if (row.readAt) return true; // 已读过，幂等

  await db.orm.public.NotificationRecipient.where({ id: recipientId }).update({
    readAt: new Date().toISOString(),
  });
  return true;
}

/** 全部标记已读。返回改动条数。 */
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

/**
 * 用户删除自己的一条通知 —— 打 deletedAt 而非真删。
 *
 * 真删会把「这行属于谁」这个事实也删掉；打标记则保留可审计的痕迹，
 * 且不影响任何别人（每人一行，天然隔离）。
 */
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

// ============================================================
// 管理侧
// ============================================================

/** 管理员看到的一条已发通知（含收件人数与已读数）。 */
export type SentNotification = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  recipientCount: number;
  readCount: number;
};

/** 列出管理员发出的通知（含统计）。 */
export async function listSentNotifications(): Promise<SentNotification[]> {
  const batches = await db.orm.public.Notification.orderBy((n) => n.createdAt.desc()).all();

  if (batches.length === 0) return [];

  // 一次取回所有批次的收件行，再按批次分组 —— 避免「每批次一次查询」的 N+1。
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

/**
 * 撤回一条通知（真删批次）。
 *
 * 这里用真删而非软删：批次是管理员的发送记录，撤回的语义就是「这些收件行
 * 也该消失」。外键 cascade 会一并清掉 NotificationRecipient —— 用户的已读/
 * 删除标记随之消失，这正是想要的。
 *
 * 注意与用户侧的软删区分：那边是「我不想看」，这边是「这条不该存在」。
 */
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
