import { describe, it, expect } from "vitest";
import { buildActivityCalendar, computeStats, type LoginEvent } from "#lib/activity";

/**
 * 活动聚合。
 *
 * 全是纯函数（输入事件数组 + now），不碰数据库 —— 所以可以直接构造边界。
 * 重点在日期边界：UTC 口径、跨天、连续天数的起止、未来日期清零。
 *
 * 固定一个"现在"让断言稳定：2026-06-15T12:00:00Z。
 */
const NOW = new Date("2026-06-15T12:00:00.000Z");

/** 造一个登录事件。 */
const ev = (iso: string): LoginEvent => ({ userId: "u1", createdAt: iso });

describe("computeStats — 登录次数", () => {
  it("没有事件时为 0", () => {
    expect(computeStats([], NOW).loginCount).toBe(0);
  });

  it("按事件数计，一天多次算多次", () => {
    const s = computeStats(
      [ev("2026-06-15T01:00:00Z"), ev("2026-06-15T09:00:00Z"), ev("2026-06-15T18:00:00Z")],
      NOW,
    );
    expect(s.loginCount).toBe(3);
  });
});

describe("computeStats — 活跃天数（按天去重）", () => {
  it("同一天多次登录只算一天", () => {
    const s = computeStats(
      [ev("2026-06-15T01:00:00Z"), ev("2026-06-15T09:00:00Z"), ev("2026-06-15T18:00:00Z")],
      NOW,
    );
    expect(s.activeDays).toBe(1);
  });

  it("跨天分别计数", () => {
    const s = computeStats([ev("2026-06-14T23:00:00Z"), ev("2026-06-15T01:00:00Z")], NOW);
    expect(s.activeDays).toBe(2);
  });

  it("UTC 边界：UTC 23:59 与次日 00:01 是两天", () => {
    const s = computeStats([ev("2026-06-14T23:59:59Z"), ev("2026-06-15T00:00:01Z")], NOW);
    expect(s.activeDays).toBe(2);
  });
});

describe("computeStats — 连续活跃", () => {
  it("今天登录过、昨天也登录 → 连续 2 天", () => {
    const s = computeStats([ev("2026-06-14T10:00:00Z"), ev("2026-06-15T10:00:00Z")], NOW);
    expect(s.currentStreak).toBe(2);
  });

  it("今天没登录 → 连续 0（不往前顺延到昨天）", () => {
    const s = computeStats([ev("2026-06-13T10:00:00Z"), ev("2026-06-14T10:00:00Z")], NOW);
    expect(s.currentStreak).toBe(0);
  });

  it("中间断了 → 只数到断点", () => {
    const s = computeStats(
      [
        ev("2026-06-10T10:00:00Z"),
        ev("2026-06-11T10:00:00Z"),
        // 6-12 缺
        ev("2026-06-13T10:00:00Z"),
        ev("2026-06-14T10:00:00Z"),
        ev("2026-06-15T10:00:00Z"),
      ],
      NOW,
    );
    expect(s.currentStreak).toBe(3);
  });

  it("一天多次登录不重复加连续", () => {
    const s = computeStats(
      [ev("2026-06-15T01:00:00Z"), ev("2026-06-15T09:00:00Z"), ev("2026-06-15T20:00:00Z")],
      NOW,
    );
    expect(s.currentStreak).toBe(1);
  });

  it("连续很长也不出错", () => {
    const events: LoginEvent[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.UTC(2026, 5, 15 - i, 10));
      events.push(ev(d.toISOString()));
    }
    expect(computeStats(events, NOW).currentStreak).toBe(30);
  });
});

describe("computeStats — 最近登录", () => {
  it("没有事件时为 null", () => {
    expect(computeStats([], NOW).lastLoginAt).toBeNull();
  });

  it("取最后一条（数组按时间升序）", () => {
    const s = computeStats(
      [ev("2026-06-13T10:00:00Z"), ev("2026-06-15T08:00:00Z"), ev("2026-06-14T10:00:00Z")],
      NOW,
    );
    // 取数组末位，不负责排序 —— 调用方的 listLoginEvents 已按升序返回
    expect(s.lastLoginAt).toBe("2026-06-14T10:00:00Z");
  });
});

describe("buildActivityCalendar", () => {
  it("返回整年（含未来的空格子）", () => {
    const cal = buildActivityCalendar([], NOW);
    expect(cal.length).toBe(365); // 2026 非闰年
    expect(cal[0]!.date).toBe("2026-01-01");
    expect(cal[cal.length - 1]!.date).toBe("2026-12-31");
  });

  it("没有活动的日子 count=0、level=0", () => {
    const cal = buildActivityCalendar([], NOW);
    expect(cal.every((d) => d.count === 0 && d.level === 0)).toBe(true);
  });

  it("有登录的日子填上次数与等级", () => {
    const cal = buildActivityCalendar(
      [ev("2026-03-10T10:00:00Z"), ev("2026-03-10T15:00:00Z"), ev("2026-03-10T20:00:00Z")],
      NOW,
    );
    const day = cal.find((d) => d.date === "2026-03-10")!;
    expect(day.count).toBe(3);
    expect(day.level).toBe(2); // 2..3 次 → level 2
  });

  it("未来的日子一律清零（哪怕事件时间戳在未来）", () => {
    // 今天 6/15，事件在 12/01（未来）
    const cal = buildActivityCalendar([ev("2026-12-01T10:00:00Z")], NOW);
    const future = cal.find((d) => d.date === "2026-12-01")!;
    expect(future.count).toBe(0);
    expect(future.level).toBe(0);
  });

  it("今天本身算在内（6/15 有事件则显示）", () => {
    const cal = buildActivityCalendar([ev("2026-06-15T08:00:00Z")], NOW);
    const today = cal.find((d) => d.date === "2026-06-15")!;
    expect(today.count).toBe(1);
  });

  it("跨 UTC 天的事件分到不同格子", () => {
    const cal = buildActivityCalendar(
      [ev("2026-06-14T23:00:00Z"), ev("2026-06-15T01:00:00Z")],
      NOW,
    );
    expect(cal.find((d) => d.date === "2026-06-14")!.count).toBe(1);
    expect(cal.find((d) => d.date === "2026-06-15")!.count).toBe(1);
  });
});

describe("等级映射", () => {
  const levelOf = (n: number) => {
    const events: LoginEvent[] = [];
    for (let i = 0; i < n; i++) events.push(ev("2026-06-15T10:00:00Z"));
    const cal = buildActivityCalendar(events, NOW);
    return cal.find((d) => d.date === "2026-06-15")!.level;
  };

  it("0 次 → 0", () => expect(levelOf(0)).toBe(0));
  it("1 次 → 1", () => expect(levelOf(1)).toBe(1));
  it("2 次 → 2", () => expect(levelOf(2)).toBe(2));
  it("4 次 → 3", () => expect(levelOf(4)).toBe(3));
  it("8 次 → 4", () => expect(levelOf(8)).toBe(4));
  it("等级不超过 4", () => expect(levelOf(50)).toBe(4));
});

// ============================================================
// 真实登录会写入事件（端到端）
// ============================================================

describe("signIn 记录登录事件", () => {
  it("登录后能查到一条事件", async () => {
    const { createUser, deleteUser, withRequest } = await import("#test/helpers");
    const { signIn } = await import("#lib/auth/session-manager");
    const { listLoginEvents } = await import("#lib/activity");

    const { user } = await createUser({ verified: true });
    try {
      expect(await listLoginEvents(user.id)).toHaveLength(0);

      await withRequest({}, () => signIn(user.id));

      const events = await listLoginEvents(user.id);
      expect(events).toHaveLength(1);
      expect(events[0]!.userId).toBe(user.id);
    } finally {
      await deleteUser(user.id);
    }
  });

  it("多次登录累加事件（不会被覆盖）", async () => {
    const { createUser, deleteUser, withRequest } = await import("#test/helpers");
    const { signIn } = await import("#lib/auth/session-manager");
    const { listLoginEvents, computeStats } = await import("#lib/activity");

    const { user } = await createUser({ verified: true });
    try {
      for (let i = 0; i < 3; i++) {
        await withRequest({}, () => signIn(user.id));
      }
      const events = await listLoginEvents(user.id);
      // 关键：Session 会被覆盖，但事件不会 —— 这是不能拿 Session 当数据源的证明
      expect(events.length).toBe(3);
      expect(computeStats(events).loginCount).toBe(3);
    } finally {
      await deleteUser(user.id);
    }
  });

  it("事件按时间升序返回（computeStats 依赖这个顺序）", async () => {
    const { createUser, deleteUser, withRequest } = await import("#test/helpers");
    const { signIn } = await import("#lib/auth/session-manager");
    const { listLoginEvents } = await import("#lib/activity");

    const { user } = await createUser({ verified: true });
    try {
      for (let i = 0; i < 3; i++) {
        await withRequest({}, () => signIn(user.id));
        await new Promise((r) => setTimeout(r, 5));
      }
      const events = await listLoginEvents(user.id);
      const times = events.map((e) => new Date(e.createdAt).getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
    } finally {
      await deleteUser(user.id);
    }
  });

  it("删用户时事件随之清除（cascade）", async () => {
    const { db } = await import("#prisma/db");
    const { createUser, deleteUser, withRequest } = await import("#test/helpers");
    const { signIn } = await import("#lib/auth/session-manager");

    const { user } = await createUser({ verified: true });
    await withRequest({}, () => signIn(user.id));
    await deleteUser(user.id);

    const left = await db.orm.public.LoginEvent.where((e) => e.userId.eq(user.id)).all();
    expect(left).toHaveLength(0);
  });
});
