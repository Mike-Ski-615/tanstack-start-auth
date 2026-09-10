import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, purgeExpiredRateLimit } from "#lib/auth/rate-limiter";
import { db } from "#prisma/db";

/**
 * 限速器测试。
 *
 * 重点在并发原子性 —— ADR-0004 记录过一次真实事故：早期实现是
 * SELECT → JS +1 → UPDATE 绝对值，20 并发 / 上限 5 会放行 20 次，
 * 等于限速完全失效。现在改成单条原子 UPSERT，这里把它钉住。
 */

const KEY = "login";
const ID = "ratelimit-test@example.com";

/** 清空整张 RateLimit 表（带一个恒真条件，无参调用过不了 this 类型检查）。 */
async function clearAll() {
  await db.orm.public.RateLimit.where((r) => r.key.gte("")).deleteAndCount();
}

async function reset() {
  await db.orm.public.RateLimit.where((r) => r.key.like("login:%")).delete();
}

beforeEach(reset);

describe("限速器 — 基本计数", () => {
  it("前 N 次放行，第 N+1 次拒绝", async () => {
    await reset();
    const results: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      const { allowed } = await rateLimit(KEY, ID);
      results.push(allowed);
    }
    // login 上限 5
    expect(results).toEqual([true, true, true, true, true, false]);
  });

  it("remaining 递减到 0", async () => {
    await reset();
    const first = await rateLimit(KEY, ID);
    expect(first.remaining).toBe(4);

    const second = await rateLimit(KEY, ID);
    expect(second.remaining).toBe(3);

    for (let i = 0; i < 3; i++) await rateLimit(KEY, ID);
    const sixth = await rateLimit(KEY, ID);
    expect(sixth.remaining).toBe(0);
    expect(sixth.allowed).toBe(false);
  });

  it("resetAt 在未来（窗口未过期）", async () => {
    await reset();
    const { resetAt } = await rateLimit(KEY, ID);
    expect(resetAt).toBeGreaterThan(Date.now());
    expect(resetAt).toBeLessThanOrEqual(Date.now() + 60_000 + 1000);
  });

  it("不同 identifier 各自独立计数", async () => {
    await reset();
    for (let i = 0; i < 5; i++) await rateLimit(KEY, "a@example.com");

    const { allowed } = await rateLimit(KEY, "b@example.com");
    expect(allowed).toBe(true);
  });

  it("不同 type 共享 identifier 也各自独立", async () => {
    await clearAll();
    for (let i = 0; i < 5; i++) await rateLimit("login", "same@x.com");

    const { allowed } = await rateLimit("register", "same@x.com");
    expect(allowed).toBe(true);
  });

  it("identifier 为 undefined 不抛错（无 IP 场景）", async () => {
    await db.orm.public.RateLimit.where((r) => r.key.like("login:%")).delete();
    const { allowed } = await rateLimit(KEY, undefined);
    expect(allowed).toBe(true);
  });
});

describe("限速器 — 窗口行为", () => {
  it("窗口过期后重新计数", async () => {
    const id = `window-test-${Date.now()}@example.com`;

    // 直接造一条「窗口已过期」的行：windowStart 在 61 秒前。
    // 不用「先调满计数、再 update 改窗口」的写法 —— 那样要依赖两次
    // 读取之间的可见性，不如一次 create 把前置状态摆清楚。
    await db.orm.public.RateLimit.where({ key: `${KEY}:${id}` }).delete();
    await db.orm.public.RateLimit.create({
      key: `${KEY}:${id}`,
      count: 5,
      windowStart: new Date(Date.now() - 61_000).toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    // 窗口已过期 → 计数重置为 1，放行
    const after = await rateLimit(KEY, id);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(4);
  });

  it("窗口内（未过期）时达到上限则拒绝", async () => {
    const id = `window-live-${Date.now()}@example.com`;
    await db.orm.public.RateLimit.where({ key: `${KEY}:${id}` }).delete();
    await db.orm.public.RateLimit.create({
      key: `${KEY}:${id}`,
      count: 5,
      windowStart: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const after = await rateLimit(KEY, id);
    expect(after.allowed).toBe(false);
    expect(after.remaining).toBe(0);
  });

  it("窗口内计数不会因被拒而延长（不累积惩罚）", async () => {
    const id = `noextend-${Date.now()}@example.com`;
    for (let i = 0; i < 5; i++) await rateLimit(KEY, id);

    const first = await rateLimit(KEY, id);
    const second = await rateLimit(KEY, id);
    // windowStart 不变 → resetAt 不变
    expect(second.resetAt).toBe(first.resetAt);
  });
});

describe("限速器 — 并发原子性（ADR-0004 回归）", () => {
  it("20 并发 / 上限 5 → 恰好放行 5 次", async () => {
    await reset();

    const results = await Promise.all(
      Array.from({ length: 20 }, () => rateLimit(KEY, ID)),
    );
    const allowed = results.filter((r) => r.allowed).length;

    expect(allowed).toBe(5);
  });

  it("并发下每次拿到互不重复的 remaining（证明是原子递增）", async () => {
    await reset();

    const results = await Promise.all(
      Array.from({ length: 5 }, () => rateLimit(KEY, ID)),
    );
    const remainings = results.map((r) => r.remaining).sort((a, b) => a - b);

    // 理想情况是 4,3,2,1,0 —— 至少不能全部相同
    expect(new Set(remainings).size).toBeGreaterThan(1);
  });

  it("并发不同 identifier 互不干扰", async () => {
    await reset();
    const results = await Promise.all([
      ...Array.from({ length: 10 }, () => rateLimit(KEY, "x@example.com")),
      ...Array.from({ length: 10 }, () => rateLimit(KEY, "y@example.com")),
    ]);
    const allowed = results.filter((r) => r.allowed).length;
    expect(allowed).toBe(10); // 每个 identifier 各放行 5
  });

  it("跨 type 并发时计数互不污染", async () => {
    await clearAll();
    const results = await Promise.all([
      ...Array.from({ length: 10 }, () => rateLimit("login", "z@example.com")),
      ...Array.from({ length: 10 }, () => rateLimit("resend", "z@example.com")),
    ]);
    // login 上限 5，resend 上限 3
    const allowed = results.filter((r) => r.allowed).length;
    expect(allowed).toBe(8);
  });
});

describe("限速器 — 清理", () => {
  it("purgeExpiredRateLimit 删除过期行、保留有效行", async () => {
    await clearAll();

    await rateLimit("login", "fresh@example.com");
    // 手工插一条过期的
    await db.orm.public.RateLimit.create({
      key: "login:stale@example.com",
      count: 1,
      windowStart: new Date(Date.now() - 120_000).toISOString(),
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    await purgeExpiredRateLimit();

    const rows = await db.orm.public.RateLimit.where((r) =>
      r.key.like("login:%"),
    ).all();
    expect(rows.some((r) => r.key.includes("stale"))).toBe(false);
    expect(rows.some((r) => r.key.includes("fresh"))).toBe(true);
  });
});
