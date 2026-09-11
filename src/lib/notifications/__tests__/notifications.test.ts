import "#test/mock-server-env";
import { describe, it, expect, afterEach } from "vitest";
import { db } from "#prisma/db";
import { createUser, deleteUser } from "#test/helpers";
import {
  resolveRecipients,
  createNotification,
  listNotificationsForUser,
  countUnread,
  markRead,
  markAllRead,
  softDeleteForUser,
  listSentNotifications,
  deleteNotificationBatch,
  MAX_RECIPIENTS,
} from "#lib/notifications";
import type { ManagedRole } from "#lib/auth/current-user";

/**
 * 通知的核心逻辑。
 *
 * 放在 lib 层直测而不是打 serverFn —— serverFn 的成功返回值在测试里拿不到
 * （见 src/test/request.ts），而「谁收到了」「未读几条」这些正是要断言的。
 * 鉴权那一层在 notifications-server.test.ts 里单独验。
 *
 * 数据库里的脏数据：本组会读到其他用例留下的用户，所以断言一律用
 * 「包含/不包含特定 id」而不是「总数等于 N」。
 */

const created: string[] = [];

afterEach(async () => {
  for (const id of created.splice(0)) await deleteUser(id);
});

async function mkUser(role: "student" | "teacher" | "admin", name?: string) {
  const { user } = await createUser({ verified: true, role, name });
  created.push(user.id);
  return user;
}

// ============================================================
// 收件人解析
// ============================================================

describe("resolveRecipients — 全体", () => {
  it("包含学生与教师，不含管理员", async () => {
    const sender = await mkUser("admin");
    const s = await mkUser("student");
    const t = await mkUser("teacher");
    const a = await mkUser("admin");

    const ids = await resolveRecipients({ all: true }, sender.id);

    expect(ids).toContain(s.id);
    expect(ids).toContain(t.id);
    expect(ids).not.toContain(a.id);
    expect(ids).not.toContain(sender.id);
  });
});

describe("resolveRecipients — 按角色", () => {
  it("只包含指定角色", async () => {
    const sender = await mkUser("admin");
    const s = await mkUser("student");
    const t = await mkUser("teacher");

    const onlyStudents = await resolveRecipients({ roles: ["student"] }, sender.id);

    expect(onlyStudents).toContain(s.id);
    expect(onlyStudents).not.toContain(t.id);
  });

  it("多角色时取并集且不重复", async () => {
    const sender = await mkUser("admin");
    const s = await mkUser("student");
    const t = await mkUser("teacher");

    const both = await resolveRecipients({ roles: ["student", "teacher"] }, sender.id);

    expect(both).toContain(s.id);
    expect(both).toContain(t.id);
    expect(new Set(both).size).toBe(both.length);
  });

  it("传非法角色（admin）不会命中任何人", async () => {
    const sender = await mkUser("admin");
    const a = await mkUser("admin");

    const ids = await resolveRecipients({ roles: ["admin" as ManagedRole] }, sender.id);

    expect(ids).not.toContain(a.id);
    expect(ids).toEqual([]);
  });
});

describe("resolveRecipients — 指定人", () => {
  it("命中所选的人", async () => {
    const sender = await mkUser("admin");
    const s = await mkUser("student");

    const ids = await resolveRecipients({ userIds: [s.id] }, sender.id);
    expect(ids).toEqual([s.id]);
  });

  it("指定 admin 会被剔除（管理员不是受众）", async () => {
    const sender = await mkUser("admin");
    const other = await mkUser("admin");
    const s = await mkUser("student");

    const ids = await resolveRecipients({ userIds: [other.id, s.id] }, sender.id);
    expect(ids).not.toContain(other.id);
    expect(ids).toContain(s.id);
  });

  it("不存在的 id 被忽略，不抛错", async () => {
    const sender = await mkUser("admin");
    const s = await mkUser("student");

    const ids = await resolveRecipients(
      { userIds: ["00000000-0000-7000-8000-000000000000", s.id] },
      sender.id,
    );
    expect(ids).toEqual([s.id]);
  });
});

describe("resolveRecipients — 组合与自排除", () => {
  it("角色 + 指定人 取并集去重", async () => {
    const sender = await mkUser("admin");
    const s1 = await mkUser("student");
    const s2 = await mkUser("student");
    const t = await mkUser("teacher");

    // 指定了 s1（也是学生），角色又选了学生 —— 应去重
    const ids = await resolveRecipients({ roles: ["student"], userIds: [s1.id, t.id] }, sender.id);

    expect(ids).toContain(s1.id);
    expect(ids).toContain(s2.id);
    expect(ids).toContain(t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("发送者若恰好是学生/教师，不会收到自己的通知", async () => {
    // 极端情况：某人的角色被改成了 student，但他仍在管理侧
    const sender = await mkUser("student");

    const ids = await resolveRecipients({ all: true }, sender.id);
    expect(ids).not.toContain(sender.id);
  });

  it("没有匹配到任何人是空数组（接口层据此报错）", async () => {
    const sender = await mkUser("admin");
    const ids = await resolveRecipients({ roles: [] }, sender.id);
    expect(ids).toEqual([]);
  });
});

// ============================================================
// 创建
// ============================================================

describe("createNotification", () => {
  it("建批次并给每个收件人一行", async () => {
    const sender = await mkUser("admin");
    const s1 = await mkUser("student");
    const s2 = await mkUser("student");

    const { id, recipientCount } = await createNotification({
      title: "停课通知",
      body: "明天停课",
      target: { userIds: [s1.id, s2.id] },
      senderId: sender.id,
    });

    expect(recipientCount).toBe(2);

    const rows = await db.orm.public.NotificationRecipient.where((r) =>
      r.notificationId.eq(id),
    ).all();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.userId).sort()).toEqual([s1.id, s2.id].sort());
  });

  it("链接为空时不写入该字段", async () => {
    const sender = await mkUser("admin");
    const s = await mkUser("student");

    const { id } = await createNotification({
      title: "无链接",
      body: "正文",
      link: null,
      target: { userIds: [s.id] },
      senderId: sender.id,
    });

    const n = await db.orm.public.Notification.where({ id }).first();
    expect(n!.link ?? null).toBeNull();
  });

  it("带站内链接时原样保存", async () => {
    const sender = await mkUser("admin");
    const s = await mkUser("student");

    const { id } = await createNotification({
      title: "去学生页",
      body: "点这里",
      link: "/authenticated/student",
      target: { userIds: [s.id] },
      senderId: sender.id,
    });

    const n = await db.orm.public.Notification.where({ id }).first();
    expect(n!.link).toBe("/authenticated/student");
  });

  it("记录发送者", async () => {
    const sender = await mkUser("admin");
    const s = await mkUser("student");

    const { id } = await createNotification({
      title: "t",
      body: "b",
      target: { userIds: [s.id] },
      senderId: sender.id,
    });

    const n = await db.orm.public.Notification.where({ id }).first();
    expect(n!.createdBy).toBe(sender.id);
  });

  it("收件人为空时也建出批次（接口层会拒绝，但 lib 不抛）", async () => {
    const sender = await mkUser("admin");
    const { recipientCount } = await createNotification({
      title: "没人收",
      body: "b",
      target: { roles: [] },
      senderId: sender.id,
    });
    expect(recipientCount).toBe(0);
  });
});

// ============================================================
// 查询与未读
// ============================================================

describe("列表与未读数", () => {
  it("只返回自己的通知", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    const other = await mkUser("student");

    await createNotification({
      title: "给你",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });
    await createNotification({
      title: "给别人",
      body: "b",
      target: { userIds: [other.id] },
      senderId: sender.id,
    });

    const list = await listNotificationsForUser(me.id);
    const titles = list.map((n) => n.title);
    expect(titles).toContain("给你");
    expect(titles).not.toContain("给别人");
  });

  it("新通知是未读，未读数正确", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");

    const before = await countUnread(me.id);
    await createNotification({
      title: "n1",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });
    await createNotification({
      title: "n2",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });

    expect(await countUnread(me.id)).toBe(before + 2);
  });

  it("列表带出批次里的标题/正文/链接", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");

    await createNotification({
      title: "标题A",
      body: "正文A",
      link: "/authenticated/student",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });

    const item = (await listNotificationsForUser(me.id)).find((n) => n.title === "标题A")!;
    expect(item.body).toBe("正文A");
    expect(item.link).toBe("/authenticated/student");
    expect(item.readAt).toBeNull();
    // 收件行 id 与批次 id 不同 —— 用户操作要用收件行 id
    expect(item.id).not.toBe(item.notificationId);
  });
});

// ============================================================
// 用户操作
// ============================================================

describe("markRead", () => {
  it("标记后未读数减一", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    await createNotification({
      title: "x",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });

    const before = await countUnread(me.id);
    const item = (await listNotificationsForUser(me.id))[0]!;
    expect(await markRead(item.id, me.id)).toBe(true);
    expect(await countUnread(me.id)).toBe(before - 1);
  });

  it("不能标记别人的通知（返回 false 且不改动）", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    const other = await mkUser("student");
    await createNotification({
      title: "别人的",
      body: "b",
      target: { userIds: [other.id] },
      senderId: sender.id,
    });

    const otherItem = (await listNotificationsForUser(other.id))[0]!;
    expect(await markRead(otherItem.id, me.id)).toBe(false);

    const after = await db.orm.public.NotificationRecipient.where({
      id: otherItem.id,
    }).first();
    expect(after!.readAt ?? null).toBeNull();
  });

  it("重复标记是幂等的", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    await createNotification({
      title: "y",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });
    const item = (await listNotificationsForUser(me.id))[0]!;

    await markRead(item.id, me.id);
    const afterFirst = await countUnread(me.id);
    await markRead(item.id, me.id);
    expect(await countUnread(me.id)).toBe(afterFirst);
  });

  it("不存在的 id 返回 false", async () => {
    const me = await mkUser("student");
    expect(await markRead("00000000-0000-7000-8000-000000000000", me.id)).toBe(false);
  });
});

describe("markAllRead", () => {
  it("把自己的未读全部清掉", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    for (const t of ["a", "b", "c"]) {
      await createNotification({
        title: t,
        body: "b",
        target: { userIds: [me.id] },
        senderId: sender.id,
      });
    }

    const n = await markAllRead(me.id);
    expect(n).toBeGreaterThanOrEqual(3);
    expect(await countUnread(me.id)).toBe(0);
  });

  it("不影响别人的未读", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    const other = await mkUser("student");
    await createNotification({
      title: "给别人的",
      body: "b",
      target: { userIds: [other.id] },
      senderId: sender.id,
    });

    const otherBefore = await countUnread(other.id);
    await markAllRead(me.id);
    expect(await countUnread(other.id)).toBe(otherBefore);
  });
});

describe("softDeleteForUser", () => {
  it("删除后自己的列表里没有了", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    await createNotification({
      title: "待删",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });

    const item = (await listNotificationsForUser(me.id)).find((n) => n.title === "待删")!;
    expect(await softDeleteForUser(item.id, me.id)).toBe(true);

    const after = await listNotificationsForUser(me.id);
    expect(after.map((n) => n.title)).not.toContain("待删");
  });

  it("删除后不计入未读数", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    await createNotification({
      title: "未读待删",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });

    const item = (await listNotificationsForUser(me.id)).find((n) => n.title === "未读待删")!;
    const before = await countUnread(me.id);
    await softDeleteForUser(item.id, me.id);
    expect(await countUnread(me.id)).toBe(before - 1);
  });

  it("不能删别人的（返回 false，对方列表不变）", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    const other = await mkUser("student");
    await createNotification({
      title: "别人的",
      body: "b",
      target: { userIds: [other.id] },
      senderId: sender.id,
    });

    const otherItem = (await listNotificationsForUser(other.id))[0]!;
    expect(await softDeleteForUser(otherItem.id, me.id)).toBe(false);
    expect((await listNotificationsForUser(other.id)).map((n) => n.title)).toContain("别人的");
  });

  it("是软删不是真删（行还在，带 deletedAt）", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    await createNotification({
      title: "软删",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });
    const item = (await listNotificationsForUser(me.id))[0]!;
    await softDeleteForUser(item.id, me.id);

    const row = await db.orm.public.NotificationRecipient.where({
      id: item.id,
    }).first();
    expect(row).toBeTruthy();
    expect(row!.deletedAt).toBeTruthy();
  });
});

// ============================================================
// 管理侧
// ============================================================

describe("listSentNotifications", () => {
  it("带出收件人数与已读数", async () => {
    const sender = await mkUser("admin");
    const s1 = await mkUser("student");
    const s2 = await mkUser("student");
    const s3 = await mkUser("student");

    const { id } = await createNotification({
      title: "统计用",
      body: "b",
      target: { userIds: [s1.id, s2.id, s3.id] },
      senderId: sender.id,
    });

    // 一个人读了
    const s1Item = (await listNotificationsForUser(s1.id)).find((n) => n.title === "统计用")!;
    await markRead(s1Item.id, s1.id);

    const sent = (await listSentNotifications()).find((n) => n.id === id)!;
    expect(sent.recipientCount).toBe(3);
    expect(sent.readCount).toBe(1);
  });

  it("按时间倒序", async () => {
    const sender = await mkUser("admin");
    const s = await mkUser("student");
    await createNotification({
      title: "旧的",
      body: "b",
      target: { userIds: [s.id] },
      senderId: sender.id,
    });
    await new Promise((r) => setTimeout(r, 20));
    await createNotification({
      title: "新的",
      body: "b",
      target: { userIds: [s.id] },
      senderId: sender.id,
    });

    const list = await listSentNotifications();
    const iNew = list.findIndex((n) => n.title === "新的");
    const iOld = list.findIndex((n) => n.title === "旧的");
    expect(iNew).toBeLessThan(iOld);
  });
});

describe("deleteNotificationBatch — 撤回", () => {
  it("批次与所有收件行一并删掉（cascade）", async () => {
    const sender = await mkUser("admin");
    const s1 = await mkUser("student");
    const s2 = await mkUser("student");
    const { id } = await createNotification({
      title: "要撤回",
      body: "b",
      target: { userIds: [s1.id, s2.id] },
      senderId: sender.id,
    });

    expect(await deleteNotificationBatch(id)).toBe(true);

    expect(await db.orm.public.Notification.where({ id }).first()).toBeNull();
    expect(
      await db.orm.public.NotificationRecipient.where((r) => r.notificationId.eq(id)).all(),
    ).toHaveLength(0);
  });

  it("撤回后收件人的列表里也没有了", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    const { id } = await createNotification({
      title: "撤回测试",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });

    expect((await listNotificationsForUser(me.id)).map((n) => n.title)).toContain("撤回测试");

    await deleteNotificationBatch(id);

    expect((await listNotificationsForUser(me.id)).map((n) => n.title)).not.toContain("撤回测试");
  });

  it("撤回后未读数也清掉了", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    const { id } = await createNotification({
      title: "撤回后未读",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });

    const before = await countUnread(me.id);
    await deleteNotificationBatch(id);
    expect(await countUnread(me.id)).toBe(before - 1);
  });

  it("撤回不影响其它通知", async () => {
    const sender = await mkUser("admin");
    const me = await mkUser("student");
    const doomed = await createNotification({
      title: "被撤的",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });
    await createNotification({
      title: "留下的",
      body: "b",
      target: { userIds: [me.id] },
      senderId: sender.id,
    });

    await deleteNotificationBatch(doomed.id);

    const list = await listNotificationsForUser(me.id);
    expect(list.map((n) => n.title)).toContain("留下的");
    expect(list.map((n) => n.title)).not.toContain("被撤的");
  });

  it("不存在的 id 返回 false", async () => {
    expect(await deleteNotificationBatch("00000000-0000-7000-8000-000000000000")).toBe(false);
  });
});

describe("上限", () => {
  it("收件人上限是个正数常量", () => {
    expect(MAX_RECIPIENTS).toBeGreaterThan(0);
  });
});
