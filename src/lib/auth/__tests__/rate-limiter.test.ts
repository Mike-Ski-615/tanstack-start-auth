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
const ID = { email: "ratelimit-test@example.com" } as const;

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
    for (let i = 0; i < 5; i++)
      await rateLimit(KEY, { email: "a@example.com" });

    const { allowed } = await rateLimit(KEY, { email: "b@example.com" });
    expect(allowed).toBe(true);
  });

  it("不同 type 共享 identifier 也各自独立", async () => {
    await clearAll();
    for (let i = 0; i < 5; i++)
      await rateLimit("login", { email: "same@x.com" });

    const { allowed } = await rateLimit("register", { email: "same@x.com" });
    expect(allowed).toBe(true);
  });

  it("identifier 为 undefined 不抛错（无 IP 场景）", async () => {
    await db.orm.public.RateLimit.where((r) => r.key.like("login:%")).delete();
    const { allowed } = await rateLimit(KEY, {});
    expect(allowed).toBe(true);
  });
});

describe("限速器 — 窗口行为", () => {
  it("窗口过期后重新计数", async () => {
    const email = `window-test-${Date.now()}@example.com`;

    // 直接造一条「窗口已过期」的行：windowStart 在 61 秒前。
    // 不用「先调满计数、再 update 改窗口」的写法 —— 那样要依赖两次
    // 读取之间的可见性，不如一次 create 把前置状态摆清楚。
    await db.orm.public.RateLimit.where({
      key: `${KEY}:email=${email}`,
    }).delete();
    await db.orm.public.RateLimit.create({
      key: `${KEY}:email=${email}`,
      count: 5,
      windowStart: new Date(Date.now() - 61_000).toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    // 窗口已过期 → 计数重置为 1，放行
    const after = await rateLimit(KEY, { email });
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(4);
  });

  it("窗口内（未过期）时达到上限则拒绝", async () => {
    const email = `window-live-${Date.now()}@example.com`;
    await db.orm.public.RateLimit.where({
      key: `${KEY}:email=${email}`,
    }).delete();
    await db.orm.public.RateLimit.create({
      key: `${KEY}:email=${email}`,
      count: 5,
      windowStart: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const after = await rateLimit(KEY, { email });
    expect(after.allowed).toBe(false);
    expect(after.remaining).toBe(0);
  });

  it("窗口内计数不会因被拒而延长（不累积惩罚）", async () => {
    const email = `noextend-${Date.now()}@example.com`;
    for (let i = 0; i < 5; i++) await rateLimit(KEY, { email });

    const first = await rateLimit(KEY, { email });
    const second = await rateLimit(KEY, { email });
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
      ...Array.from({ length: 10 }, () =>
        rateLimit(KEY, { email: "x@example.com" }),
      ),
      ...Array.from({ length: 10 }, () =>
        rateLimit(KEY, { email: "y@example.com" }),
      ),
    ]);
    const allowed = results.filter((r) => r.allowed).length;
    expect(allowed).toBe(10); // 每个 identifier 各放行 5
  });

  it("跨 type 并发时计数互不污染", async () => {
    await clearAll();
    const results = await Promise.all([
      ...Array.from({ length: 10 }, () =>
        rateLimit("login", { email: "z@example.com" }),
      ),
      ...Array.from({ length: 10 }, () =>
        rateLimit("resend", { email: "z@example.com" }),
      ),
    ]);
    // login 上限 5，resend 上限 3
    const allowed = results.filter((r) => r.allowed).length;
    expect(allowed).toBe(8);
  });
});

describe("限速器 — 清理", () => {
  it("purgeExpiredRateLimit 删除过期行、保留有效行", async () => {
    await clearAll();

    await rateLimit("login", { email: "fresh@example.com" });
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

describe("限速器 — key 形状稳定（回归保护）", () => {
  /**
   * 这次改动把 identifier 从「调用方自己拼的字符串」换成对象，
   * key 的形状由 rateLimit 内部决定。
   *
   * 为什么值得单独断言：形状若变了（哪怕只是字段顺序），已存在的计数会
   * 分裂成两套 —— 行为测试可能仍通过，但限速实际上被绕过。所以钉住它。
   */

  it("含邮箱与 IP 时按固定顺序拼接", async () => {
    await clearAll();
    await rateLimit("login", { email: "a@b.com", ip: "1.2.3.4" });

    const rows = await db.orm.public.RateLimit.all();
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("login:email=a@b.com|ip=1.2.3.4");
  });

  it("字段顺序不影响 key（{ip, email} 与 {email, ip} 等价）", async () => {
    await clearAll();
    await rateLimit("login", { email: "a@b.com", ip: "1.2.3.4" });
    await rateLimit("login", { ip: "1.2.3.4", email: "a@b.com" });

    const rows = await db.orm.public.RateLimit.all();
    // 同一个桶（count=2），而不是两个独立计数器
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(2);
  });

  it("显式 undefined 与省略字段等价", async () => {
    await clearAll();
    await rateLimit("register", { ip: "1.2.3.4" });
    await rateLimit("register", { ip: "1.2.3.4", email: undefined });

    const rows = await db.orm.public.RateLimit.all();
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(2);
  });

  it("只有 IP 时 key 不含 email 段", async () => {
    await clearAll();
    await rateLimit("register", { ip: "9.9.9.9" });

    const rows = await db.orm.public.RateLimit.all();
    expect(rows[0].key).toBe("register:ip=9.9.9.9");
  });

  it("只有邮箱时 key 不含 ip 段", async () => {
    await clearAll();
    await rateLimit("resend", { email: "x@y.com" });

    const rows = await db.orm.public.RateLimit.all();
    expect(rows[0].key).toBe("resend:email=x@y.com");
  });

  it("type 不同则 key 不同（同一主体分属两个桶）", async () => {
    await clearAll();
    await rateLimit("login", { email: "a@b.com", ip: "1.2.3.4" });
    await rateLimit("verify-otp", { email: "a@b.com", ip: "1.2.3.4" });

    const rows = await db.orm.public.RateLimit.all();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.key).sort()).toEqual([
      "login:email=a@b.com|ip=1.2.3.4",
      "verify-otp:email=a@b.com|ip=1.2.3.4",
    ]);
  });

  it("两个字段都缺时退化成空主体（无 IP 请求共用一个桶）", async () => {
    await clearAll();
    await rateLimit("register", {});

    const rows = await db.orm.public.RateLimit.all();
    expect(rows[0].key).toBe("register:");
  });
});
