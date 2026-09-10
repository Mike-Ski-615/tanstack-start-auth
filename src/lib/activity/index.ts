/**
 * 用户活动：登录事件的记录与聚合。
 *
 * 认证模块之外的业务模块，分层同 notifications / admin-actions：**查询与写入
 * 放这里当普通函数**，serverFn 只做鉴权与转发 —— serverFn 的成功返回值在
 * 测试里拿不到（见 src/test/request.ts），而热力图与统计必须断言返回值。
 *
 * 数据源是 LoginEvent 表（每次成功登录一行）。**不用 Session 表** ——
 * 单设备模型下 Session.userId 是 UNIQUE，新登录覆盖旧记录，历史会丢光。
 */

import { db } from "#prisma/db";

/** 一次登录事件。 */
export type LoginEvent = {
  userId: string;
  createdAt: string;
};

/** 热力图的一格（react-activity-calendar 要的形状）。 */
export type ActivityDay = {
  date: string; // yyyy-MM-dd（UTC）
  count: number;
  level: number;
};

/** 主页统计区的一格数据。 */
export type ActivityStats = {
  /** 累计登录次数。 */
  loginCount: number;
  /** 有登录记录的天数。 */
  activeDays: number;
  /** 从最近一次登录往前连续的天数（今天没登录则为 0）。 */
  currentStreak: number;
  /** 最近一次登录时间（ISO），从未登录为 null。 */
  lastLoginAt: string | null;
};

// ============================================================
// 写入
// ============================================================

/**
 * 记录一次登录。
 *
 * 由 signIn() 调用 —— 那是所有「登录成功」路径的统一入口（登录、注册后
 * 自动登录、改密后重建会话、重置密码后自动登录）。这些都是一次真实的
 * 登录行为，都该计入活动。
 *
 * **失败会被吞掉**：活动统计是附属信息，不能因为它写不进去就让用户登录失败。
 * 与 touchLastSeen 同样的取舍（见 device.ts）。
 */
export async function recordLogin(userId: string): Promise<void> {
  try {
    await db.orm.public.LoginEvent.create({ userId });
  } catch {
    // 静默：登录不该因为统计失败而失败
  }
}

// ============================================================
// 查询
// ============================================================

/**
 * UTC 的 yyyy-MM-dd。
 *
 * 全程 UTC 的原因与 heatmap 原来那段注释一致：服务端与浏览器的本地时区
 * 可能不同，用本地时间算「今天」会导致 SSR 与客户端的分界不一致
 * （水合不匹配，且「今天的格子」会跳）。
 */
function isoDayUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

const DAY_MS = 86_400_000;

/** 按 UTC 天把 date 归到当天零点。 */
function startOfDayUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * 该用户的所有登录事件（时间升序）。
 *
 * 不分页：登录频率是「一人一天几次」的量级，一年也就几百条。真到需要
 * 分页时再加。
 */
export async function listLoginEvents(userId: string): Promise<LoginEvent[]> {
  const rows = await db.orm.public.LoginEvent.where((e) => e.userId.eq(userId))
    .orderBy((e) => e.createdAt.asc())
    .all();
  return rows.map((r) => ({ userId: r.userId, createdAt: r.createdAt }));
}

/** count → 0..4 的活跃等级（与热力图配色一一对应）。 */
function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

/**
 * 把登录事件聚合成整年（1/1 – 12/31）的每日格子。
 *
 * 两个口径都保留：
 * - 热力图按**天的次数**着色（一天登录 3 次 = 更深的一格）
 * - activeDays / currentStreak 按**天去重**计
 *
 * 未来的日期也返回（count=0），让整年网格保持完整显示。
 */
export function buildActivityCalendar(events: LoginEvent[], now = new Date()): ActivityDay[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    const day = isoDayUTC(new Date(e.createdAt));
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const year = now.getUTCFullYear();
  const startUTC = Date.UTC(year, 0, 1);
  const endUTC = Date.UTC(year, 11, 31);
  const todayUTC = startOfDayUTC(now);

  const days: ActivityDay[] = [];
  for (let t = startUTC; t <= endUTC; t += DAY_MS) {
    const date = isoDayUTC(new Date(t));
    // 未来的格子一律清零 —— 保证「今天之后没有活动」
    const count = t <= todayUTC ? (counts.get(date) ?? 0) : 0;
    days.push({ date, count, level: levelFor(count) });
  }
  return days;
}

/**
 * 统计区用的一组数字。
 *
 * currentStreak 的口径：**从今天往前数连续有登录的天数**。今天还没登录时
 * 为 0（而不是「从昨天往前数」）—— 后者会让「昨天登录过、今天还没」的人
 * 看到一个并未持续到今天的连续天数，容易误解。
 */
export function computeStats(events: LoginEvent[], now = new Date()): ActivityStats {
  const days = new Set(events.map((e) => isoDayUTC(new Date(e.createdAt))));

  let streak = 0;
  const todayUTC = startOfDayUTC(now);
  for (let t = todayUTC; ; t -= DAY_MS) {
    if (!days.has(isoDayUTC(new Date(t)))) break;
    streak += 1;
  }

  const last = events.length ? events[events.length - 1]!.createdAt : null;

  return {
    loginCount: events.length,
    activeDays: days.size,
    currentStreak: streak,
    lastLoginAt: last,
  };
}

/** 便捷组合：取某用户的完整活动数据。 */
export async function getActivityForUser(
  userId: string,
  now = new Date(),
): Promise<{ calendar: ActivityDay[]; stats: ActivityStats }> {
  const events = await listLoginEvents(userId);
  return {
    calendar: buildActivityCalendar(events, now),
    stats: computeStats(events, now),
  };
}
