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
import { setResponseStatus, setResponseHeader } from "@tanstack/react-start/server";
import { ERROR_MESSAGE } from "#lib/error-messages";

const WINDOW_MS = 60_000; // 1 分钟

const LIMITS = {
  login: 5,
  register: 3,
  reset: 3,
  resend: 3,
  // OTP 验证：同一邮箱+IP 1 分钟 10 次。单枚 OTP 另有 5 次错误上限
  // （MAX_OTP_ATTEMPTS），这里防的是「不断重发新 OTP 再撞」。
  "verify-otp": 10,
  "reset-verify": 10,
} as const;

type LimitKey = keyof typeof LIMITS;

/**
 * 限速的主体：被限的是什么（IP / 邮箱 / 两者）。
 *
 * 用对象而非拼好的字符串：以前调用方各自拼 identifier，结果出现三种风格
 * （裸 `ip`、`ip:1.2.3.4`、`email:a@b.com`、`a@b.com:1.2.3.4`）。
 * 拼错了不会报错，只会静默产生一个独立的计数器 —— 限速看上去在工作，
 * 实际上没有挡任何人。现在 key 的形状由本模块决定，调用方拼不出花样。
 *
 * 字段值为 undefined 时会被跳过（键保留、值不参与），这样「无 IP」的
 * 请求会落到同一个桶 —— 与改动前 `register:undefined` 的行为等价，
 * 是已知上限，不是新引入的问题。
 */
export interface RateSubject {
  ip?: string | undefined;
  email?: string | undefined;
}

/**
 * 把主体序列化成稳定的 key 片段。
 *
 * 按固定字段顺序手拼，不用 JSON.stringify —— 后者的输出取决于对象的
 * 键插入顺序（{ip, email} 与 {email, ip} 会得到不同字符串），
 * 那样同一个组合会分裂成两个计数器，限速被悄悄绕过。
 *
 * 同时跳过 undefined：让 {ip: "1.2.3.4"} 与 {ip: "1.2.3.4", email: undefined}
 * 得到同一个 key，否则调用方写法一差就对不上了。
 */
function subjectKey(subject: RateSubject): string {
  const parts: string[] = [];
  if (subject.email !== undefined) parts.push(`email=${subject.email}`);
  if (subject.ip !== undefined) parts.push(`ip=${subject.ip}`);
  return parts.join("|");
}

export async function rateLimit(
  type: LimitKey,
  subject: RateSubject,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `${type}:${subjectKey(subject)}`;
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

/**
 * 限速未通过时抛的错误。
 *
 * 用固定标识符而非英文句子：客户端目前的 onError 无法区分「凭据错误」
 * 与「被限速」（全部显示笼统文案），所以这句 message 暂无消费者。
 * 写成稳定的标识符，将来要做区分时可以直接匹配，比匹配英文句子可靠。
 */
export const RATE_LIMITED = ERROR_MESSAGE.RATE_LIMITED;

/**
 * 限速检查：未通过时设 429 + Retry-After 并抛错，通过则静默返回。
 *
 * 抽它的原因：这个「检查 → 设响应头 → 抛错」的序列在七个调用点各写了一遍，
 * 且已经不一致 —— register 漏了 setResponseStatus(429)（却设了 Retry-After，
 * 而 Retry-After 只在 4xx/5xx 上有含义），另外错误文案有三种写法的变体。
 *
 * 调用方只需：await enforceRateLimit("login", { email, ip });
 */
export async function enforceRateLimit(type: LimitKey, subject: RateSubject): Promise<void> {
  const { allowed, resetAt } = await rateLimit(type, subject);
  if (allowed) return;

  setResponseStatus(429);
  setResponseHeader("Retry-After", String(Math.ceil((resetAt - Date.now()) / 1000)));
  throw new Error(RATE_LIMITED);
}

/** 清理过期行（可定时调用或懒删除）。 */
export async function purgeExpiredRateLimit(): Promise<void> {
  const now = new Date().toISOString();
  // DB-side 条件删除
  await db.orm.public.RateLimit.where((r) => r.expiresAt.lt(now)).deleteAndCount();
}
