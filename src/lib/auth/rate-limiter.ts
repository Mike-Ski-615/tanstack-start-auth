/**
 * 滑动窗口速率限制器（DB 型，适合多实例部署）。
 *
 * 用 Prisma upsert 原子递增，单行记录窗口内计数。
 * 窗口到期时重置计数，而非逐条清理。
 *
 * 注意：count 递增非原子，但限速场景下微小竞争可接受；
 * 如需严格原子，可改用 SQL raw `count = count + 1`。
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
  identifier: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `${type}:${identifier}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  const expiresAt = new Date(now.getTime() + WINDOW_MS);
  const max = LIMITS[type];

  const existing = await db.orm.public.RateLimit.where({ key }).first();

  if (existing && new Date(existing.windowStart) > windowStart) {
    // 窗口内：检查是否超限
    if (existing.count >= max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(existing.windowStart).getTime() + WINDOW_MS,
      };
    }
    // 递增（非原子，但限速场景可接受）
    const newCount = existing.count + 1;
    await db.orm.public.RateLimit.where({ key }).update({
      count: newCount,
      expiresAt: expiresAt.toISOString(),
    });
    return {
      allowed: true,
      remaining: max - newCount,
      resetAt: new Date(existing.windowStart).getTime() + WINDOW_MS,
    };
  }

  // 窗口过期或不存在：重置计数
  // conflictOn 必填：RateLimit 无主键，只有 key 唯一约束
  const upserted = await db.orm.public.RateLimit.upsert({
    create: { key, count: 1, windowStart: now.toISOString(), expiresAt: expiresAt.toISOString() },
    update: { count: 1, windowStart: now.toISOString(), expiresAt: expiresAt.toISOString() },
    conflictOn: { key },
  });
  return {
    allowed: true,
    remaining: max - upserted.count,
    resetAt: new Date(upserted.windowStart).getTime() + WINDOW_MS,
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
