/**
 * 滑动窗口速率限制器（DB 型，适合多实例部署）。
 *
 * 单条原子 UPSERT 完成「窗口判断 + 递增/重置 + 取回计数」，没有 check-then-act 竞态。
 *
 * 为什么不能写成 SELECT → JS +1 → UPDATE 绝对值：并发请求会全部读到同一个旧值、
 * 全部通过 `count >= max` 检查、全部写回同一个新值。实测 20 并发 / 限制 5 会
 * **放行 20 次**（见 ADR-0004）。而限速器要挡的正是突发流量，突发即并发 ——
 * 所以这不是「微小竞争」，是限速可被完全绕过。
 *
 * count 语义为「窗口内的尝试次数」：被拒的请求也计数，但不会推迟 windowStart，
 * 因此不会延长封锁。并发下每个请求拿到互不重复的 count，恰好前 max 个放行。
 */

import { db } from "#prisma/db";

const WINDOW_MS = 60_000; // 1 分钟

const LIMITS = {
  login: 5,
  register: 3,
  reset: 3,
  resend: 3,
} as const;

type LimitKey = keyof typeof LIMITS;

export async function rateLimit(
  type: LimitKey,
  identifier: string | undefined,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `${type}:${identifier}`;
  const max = LIMITS[type];
  const now = new Date();
  const nowIso = now.toISOString();
  const windowStartIso = new Date(now.getTime() - WINDOW_MS).toISOString();
  const expiresAtIso = new Date(now.getTime() + WINDOW_MS).toISOString();

  // ponytail: 表名/列名是原始 SQL 里的字面量，没有编译期保护 ——
  // 改契约里的 RateLimit 表或这几列时要同步改这里（改了不会有类型报错，
  // 只会在运行时炸）。上限可接受：这是内置表，且这张表就一个用途。
  const plan = db.raw.sql`
    INSERT INTO "public"."RateLimit" ("key", "count", "windowStart", "expiresAt")
    VALUES (${key}, 1, ${nowIso}::timestamptz, ${expiresAtIso}::timestamptz)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" > ${windowStartIso}::timestamptz
        THEN "RateLimit"."count" + 1
        ELSE 1
      END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" > ${windowStartIso}::timestamptz
        THEN "RateLimit"."windowStart"
        ELSE ${nowIso}::timestamptz
      END,
      "expiresAt" = ${expiresAtIso}::timestamptz
    RETURNING "count", "windowStart"
  `
    .returnsRow({
      count: { codecId: "pg/int4@1" },
      windowStart: { codecId: "pg/timestamptz-string@1" },
    })
    .build();

  const [row] = await db.runtime().query(plan);
  const count = row?.count ?? 1;

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    resetAt: new Date(row?.windowStart ?? nowIso).getTime() + WINDOW_MS,
  };
}

/** 清理过期行（可定时调用或懒删除）。 */
export async function purgeExpiredRateLimit(): Promise<void> {
  const now = new Date().toISOString();
  // DB-side 条件删除
  await db.orm.public.RateLimit.where(
    (r) => r.expiresAt.lt(now),
  ).deleteAndCount();
}
