import "#test/mock-server-env";
import { describe, it, expect, afterEach } from "vitest";
import {
  sendNotificationFn,
  listSentNotificationsFn,
  deleteNotificationBatchFn,
  listSelectableUsersFn,
  listNotificationsFn,
  unreadCountFn,
  markNotificationReadFn,
  markAllNotificationsReadFn,
  deleteNotificationFn,
  updateNotificationPrefsFn,
} from "#server/notifications.functions";
import {
  sendNotificationSchema,
  notificationRecipientIdSchema,
  notificationBatchIdSchema,
  notificationPrefsSchema,
} from "#schemas/auth";
import { db } from "#prisma/db";
import { createUser, deleteUser, callServerFnValidated, callServerFn } from "#test/helpers";
import type { CallContext, ExecutableServerFn } from "#test/request";
import { createNotification } from "#lib/notifications";
import { ERROR_MESSAGE } from "#lib/error-messages";

/**
 * 通知接口的鉴权与校验。
 *
 * 与 notifications.test.ts 的分工：那边直测 lib 层逻辑（返回值可断言），
 * 这边只关心「谁能调」和「输入校验」—— 这些必须经 serverFn 才成立。
 *
 * 用户侧的重点是：**不能操作别人的收件行**。接口从 guard 取 userId 再带进
 * 查询条件，不接受「你要操作哪一行属于谁」这种参数。
 */

const created: string[] = [];
const IP = "192.0.2.70";

afterEach(async () => {
  for (const id of created.splice(0)) await deleteUser(id);
});

const ctx = (token?: string): CallContext => (token ? { cookies: { "session-token": token } } : {});

/**
 * 无参 serverFn 的调用辅助。
 *
 * callServerFn 的签名要求 args 与 handler 的参数类型匹配 —— 无参 handler
 * 的参数是 undefined，传 {} 会被类型拒绝。传 undefined 即可。
 */
const callNoArgs = <T>(fn: ExecutableServerFn, c: CallContext = {}) =>
  callServerFn<undefined, T>(fn, undefined, c);

async function userWithSession(role: "student" | "teacher" | "admin") {
  const { user, email } = await createUser({ verified: true, role });
  created.push(user.id);
  const { createAuthenticatedSession } = await import("#lib/auth/session-manager");
  const { token } = await createAuthenticatedSession({
    userId: user.id,
    userAgent: "vitest",
    ip: IP,
  });
  return { user, email, token };
}

const sendPayload = {
  title: "标题",
  body: "正文",
  roles: ["student"] as const,
};

// ============================================================
// 管理侧鉴权
// ============================================================

describe("只有管理员能发通知", () => {
  it("未登录被拒", async () => {
    await expect(
      callServerFnValidated(
        sendNotificationFn,
        sendNotificationSchema,
        { ...sendPayload, roles: ["student"] },
        {},
      ),
    ).rejects.toThrow(ERROR_MESSAGE.FORBIDDEN);
  });

  it("学生被拒", async () => {
    const s = await userWithSession("student");
    await expect(
      callServerFnValidated(
        sendNotificationFn,
        sendNotificationSchema,
        { ...sendPayload, roles: ["student"] },
        ctx(s.token),
      ),
    ).rejects.toThrow(ERROR_MESSAGE.FORBIDDEN);
  });

  it("教师被拒", async () => {
    const t = await userWithSession("teacher");
    await expect(
      callServerFnValidated(
        sendNotificationFn,
        sendNotificationSchema,
        { ...sendPayload, roles: ["student"] },
        ctx(t.token),
      ),
    ).rejects.toThrow(ERROR_MESSAGE.FORBIDDEN);
  });

  it("被拒时不会建出任何通知", async () => {
    const s = await userWithSession("student");
    const before = (await db.orm.public.Notification.all()).length;

    await callServerFnValidated(
      sendNotificationFn,
      sendNotificationSchema,
      { title: "偷发的", body: "b", roles: ["student"] },
      ctx(s.token),
    ).catch(() => {});

    const after = await db.orm.public.Notification.all();
    expect(after.length).toBe(before);
    expect(after.map((n) => n.title)).not.toContain("偷发的");
  });
});

describe("只有管理员能看已发通知 / 撤回 / 列用户", () => {
  it("学生不能列已发通知", async () => {
    const s = await userWithSession("student");
    await expect(callNoArgs(listSentNotificationsFn, ctx(s.token))).rejects.toThrow(
      ERROR_MESSAGE.FORBIDDEN,
    );
  });

  it("学生不能撤回", async () => {
    const s = await userWithSession("student");
    await expect(
      callServerFnValidated(
        deleteNotificationBatchFn,
        notificationBatchIdSchema,
        { notificationId: "00000000-0000-7000-8000-000000000000" },
        ctx(s.token),
      ),
    ).rejects.toThrow(ERROR_MESSAGE.FORBIDDEN);
  });

  it("学生不能列出可选用户（名单含全部邮箱）", async () => {
    const s = await userWithSession("student");
    await expect(callNoArgs(listSelectableUsersFn, ctx(s.token))).rejects.toThrow(
      ERROR_MESSAGE.FORBIDDEN,
    );
  });
});

// ============================================================
// 输入校验
// ============================================================

describe("发送时的输入校验", () => {
  const asAdmin = async () => {
    const { user, token } = await userWithSession("admin");
    return { admin: user, token };
  };

  it("标题不能为空", async () => {
    const { token } = await asAdmin();
    await expect(
      callServerFnValidated(
        sendNotificationFn,
        sendNotificationSchema,
        { title: "   ", body: "b", roles: ["student"] },
        ctx(token),
      ),
    ).rejects.toThrow();
  });

  it("正文不能为空", async () => {
    const { token } = await asAdmin();
    await expect(
      callServerFnValidated(
        sendNotificationFn,
        sendNotificationSchema,
        { title: "t", body: "", roles: ["student"] },
        ctx(token),
      ),
    ).rejects.toThrow();
  });

  it("标题超长被拒", async () => {
    const { token } = await asAdmin();
    await expect(
      callServerFnValidated(
        sendNotificationFn,
        sendNotificationSchema,
        { title: "x".repeat(101), body: "b", roles: ["student"] },
        ctx(token),
      ),
    ).rejects.toThrow();
  });

  it("正文超长被拒", async () => {
    const { token } = await asAdmin();
    await expect(
      callServerFnValidated(
        sendNotificationFn,
        sendNotificationSchema,
        { title: "t", body: "x".repeat(1001), roles: ["student"] },
        ctx(token),
      ),
    ).rejects.toThrow();
  });

  it("外部链接被拒（防钓鱼入口）", async () => {
    const { token } = await asAdmin();
    for (const bad of [
      "https://evil.example.com",
      "http://evil.example.com",
      "//evil.example.com",
      "javascript:alert(1)",
      "evil.com",
    ]) {
      await expect(
        callServerFnValidated(
          sendNotificationFn,
          sendNotificationSchema,
          { title: "t", body: "b", link: bad, roles: ["student"] },
          ctx(token),
        ),
        `应该拒绝 ${bad}`,
      ).rejects.toThrow();
    }
  });

  it("站内路径通过校验", async () => {
    const { token } = await asAdmin();
    // 必须有人可发 —— 接口在收件人为 0 时会报“没有匹配的收件人”
    const target = await createUser({ verified: true, role: "student" });
    created.push(target.user.id);
    // 读不到返回值（client 存根的限制），断言数据库副作用更严格
    await callServerFnValidated(
      sendNotificationFn,
      sendNotificationSchema,
      {
        title: "带链接",
        body: "b",
        link: "/authenticated/student",
        roles: ["student"],
      },
      ctx(token),
    );

    const n = (await db.orm.public.Notification.all()).find((x) => x.title === "带链接");
    expect(n).toBeTruthy();
    expect(n!.link).toBe("/authenticated/student");
  });

  it("空链接视为不填", async () => {
    const { token } = await asAdmin();
    const target = await createUser({ verified: true, role: "student" });
    created.push(target.user.id);
    await callServerFnValidated(
      sendNotificationFn,
      sendNotificationSchema,
      { title: "空链接", body: "b", link: "", roles: ["student"] },
      ctx(token),
    );

    const n = (await db.orm.public.Notification.all()).find((x) => x.title === "空链接");
    expect(n).toBeTruthy();
    // 空字符串应转成 null，而不是存一个空串
    expect(n!.link ?? null).toBeNull();
  });

  it("非法的角色值被拒", async () => {
    const { token } = await asAdmin();
    await expect(
      callServerFnValidated(
        sendNotificationFn,
        sendNotificationSchema,
        { title: "t", body: "b", roles: ["admin"] as never },
        ctx(token),
      ),
    ).rejects.toThrow();
  });
});

describe("勾了全体时忽略另外两项", () => {
  it("all=true 时指定的 userIds 不起作用（不会重复发）", async () => {
    const { user: admin, token } = await userWithSession("admin");
    const target = await createUser({ verified: true, role: "student" });
    created.push(target.user.id);

    await callServerFnValidated(
      sendNotificationFn,
      sendNotificationSchema,
      {
        title: "全体通知",
        body: "b",
        all: true,
        userIds: [target.user.id],
      },
      ctx(token),
    );

    // 找自己那条批次。
    //
    // 不能用 title 匹配：其它测试文件也会发出同名通知（全量跑时同一个库），
    // .find() 会随机挑中别人的那条 —— 表现为「单独跑通过、全量跑失败」。
    // 用「发送者 + 标题」双条件，再取最新的那条。
    const mine = (await db.orm.public.Notification.all())
      .filter((n) => n.title === "全体通知" && n.createdBy === admin.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    expect(mine.length).toBeGreaterThan(0);
    const batch = mine[0]!;

    const rows = await db.orm.public.NotificationRecipient.where((r) =>
      r.notificationId.eq(batch.id),
    ).all();

    // 关键断言：该用户只被插入一行（all 分支忽略 userIds，不会重复）
    const forTarget = rows.filter((r) => r.userId === target.user.id);
    expect(forTarget).toHaveLength(1);
  });
});

// ============================================================
// 用户侧鉴权
// ============================================================

describe("用户侧鉴权", () => {
  it("未登录不能读列表", async () => {
    await expect(callNoArgs(listNotificationsFn, {})).rejects.toThrow(
      ERROR_MESSAGE.UNAUTHENTICATED,
    );
  });

  it("未登录不能读未读数", async () => {
    await expect(callNoArgs(unreadCountFn, {})).rejects.toThrow(ERROR_MESSAGE.UNAUTHENTICATED);
  });

  it("未登录不能标已读", async () => {
    await expect(
      callServerFnValidated(
        markNotificationReadFn,
        notificationRecipientIdSchema,
        { recipientId: "00000000-0000-7000-8000-000000000000" },
        {},
      ),
    ).rejects.toThrow(ERROR_MESSAGE.UNAUTHENTICATED);
  });

  it("未登录不能全部已读", async () => {
    await expect(callNoArgs(markAllNotificationsReadFn, {})).rejects.toThrow(
      ERROR_MESSAGE.UNAUTHENTICATED,
    );
  });

  it("未登录不能删除", async () => {
    await expect(
      callServerFnValidated(
        deleteNotificationFn,
        notificationRecipientIdSchema,
        { recipientId: "00000000-0000-7000-8000-000000000000" },
        {},
      ),
    ).rejects.toThrow(ERROR_MESSAGE.UNAUTHENTICATED);
  });
});

describe("用户不能操作别人的收件行", () => {
  it("标已读：改不动别人的", async () => {
    const admin = await userWithSession("admin");
    const victim = await userWithSession("student");
    const attacker = await userWithSession("student");

    await createNotification({
      title: "给受害者的",
      body: "b",
      target: { userIds: [victim.user.id] },
      senderId: admin.user.id,
    });

    const row = await db.orm.public.NotificationRecipient.where((r) =>
      r.userId.eq(victim.user.id),
    ).first();

    await callServerFnValidated(
      markNotificationReadFn,
      notificationRecipientIdSchema,
      { recipientId: row!.id },
      ctx(attacker.token),
    );

    const after = await db.orm.public.NotificationRecipient.where({
      id: row!.id,
    }).first();
    expect(after!.readAt ?? null).toBeNull();
  });

  it("删除：删不掉别人的", async () => {
    const admin = await userWithSession("admin");
    const victim = await userWithSession("student");
    const attacker = await userWithSession("student");

    await createNotification({
      title: "别人不该删得掉",
      body: "b",
      target: { userIds: [victim.user.id] },
      senderId: admin.user.id,
    });

    const row = await db.orm.public.NotificationRecipient.where((r) =>
      r.userId.eq(victim.user.id),
    ).first();

    await callServerFnValidated(
      deleteNotificationFn,
      notificationRecipientIdSchema,
      { recipientId: row!.id },
      ctx(attacker.token),
    );

    const after = await db.orm.public.NotificationRecipient.where({
      id: row!.id,
    }).first();
    expect(after!.deletedAt ?? null).toBeNull();
  });

  it("全部已读只清自己的", async () => {
    const admin = await userWithSession("admin");
    const victim = await userWithSession("student");
    const attacker = await userWithSession("student");

    await createNotification({
      title: "受害者的未读",
      body: "b",
      target: { userIds: [victim.user.id] },
      senderId: admin.user.id,
    });

    await callNoArgs(markAllNotificationsReadFn, ctx(attacker.token));

    const victimRows = await db.orm.public.NotificationRecipient.where((r) =>
      r.userId.eq(victim.user.id),
    ).all();
    expect(victimRows.every((r) => r.readAt == null)).toBe(true);
  });
});

// ============================================================
// 通知偏好
// ============================================================

describe("通知偏好", () => {
  it("新用户默认开启弹窗提醒", async () => {
    const s = await userWithSession("student");
    const row = await db.orm.public.User.where({ id: s.user.id }).first();
    expect(row!.notifyOnNewMessage).toBe(true);
  });

  it("能关掉", async () => {
    const s = await userWithSession("student");
    await callServerFnValidated(
      updateNotificationPrefsFn,
      notificationPrefsSchema,
      { notifyOnNewMessage: false },
      ctx(s.token),
    );
    const row = await db.orm.public.User.where({ id: s.user.id }).first();
    expect(row!.notifyOnNewMessage).toBe(false);
  });

  it("能重新打开", async () => {
    const s = await userWithSession("student");
    for (const v of [false, true]) {
      await callServerFnValidated(
        updateNotificationPrefsFn,
        notificationPrefsSchema,
        { notifyOnNewMessage: v },
        ctx(s.token),
      );
    }
    const row = await db.orm.public.User.where({ id: s.user.id }).first();
    expect(row!.notifyOnNewMessage).toBe(true);
  });

  it("未登录改不了", async () => {
    await expect(
      callServerFnValidated(
        updateNotificationPrefsFn,
        notificationPrefsSchema,
        { notifyOnNewMessage: false },
        {},
      ),
    ).rejects.toThrow(ERROR_MESSAGE.UNAUTHENTICATED);
  });

  it("只改自己的 —— 别人的偏好不受影响", async () => {
    const me = await userWithSession("student");
    const other = await userWithSession("student");

    await callServerFnValidated(
      updateNotificationPrefsFn,
      notificationPrefsSchema,
      { notifyOnNewMessage: false },
      ctx(me.token),
    );

    const otherRow = await db.orm.public.User.where({
      id: other.user.id,
    }).first();
    expect(otherRow!.notifyOnNewMessage).toBe(true);
  });

  it("管理员也改不了别人的（接口不接受 userId 参数）", async () => {
    const admin = await userWithSession("admin");
    const target = await userWithSession("student");

    await callServerFnValidated(
      updateNotificationPrefsFn,
      notificationPrefsSchema,
      // 多余字段会被 schema strip 掉；即便塞进来也无效
      { notifyOnNewMessage: false, userId: target.user.id } as never,
      ctx(admin.token),
    );

    const adminRow = await db.orm.public.User.where({
      id: admin.user.id,
    }).first();
    const targetRow = await db.orm.public.User.where({
      id: target.user.id,
    }).first();
    // 改的是管理员自己，目标纹丝不动
    expect(adminRow!.notifyOnNewMessage).toBe(false);
    expect(targetRow!.notifyOnNewMessage).toBe(true);
  });
});
