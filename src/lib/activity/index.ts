import { db } from "#prisma/db";

export type LoginEvent = {
  userId: string;
  createdAt: string;
};

export type ActivityDay = {
  date: string;
  count: number;
  level: number;
};

export type ActivityStats = {
  loginCount: number;
  activeDays: number;
  currentStreak: number;
  lastLoginAt: string | null;
};

export async function recordLogin(userId: string): Promise<void> {
  try {
    await db.orm.public.LoginEvent.create({ userId });
  } catch {}
}

function isoDayUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

const DAY_MS = 86_400_000;

function startOfDayUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export async function listLoginEvents(userId: string): Promise<LoginEvent[]> {
  const rows = await db.orm.public.LoginEvent.where((e) => e.userId.eq(userId))
    .orderBy((e) => e.createdAt.asc())
    .all();
  return rows.map((r) => ({ userId: r.userId, createdAt: r.createdAt }));
}

function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

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
    const count = t <= todayUTC ? (counts.get(date) ?? 0) : 0;
    days.push({ date, count, level: levelFor(count) });
  }
  return days;
}

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
