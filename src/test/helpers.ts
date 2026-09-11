/**
 * 认证测试专用工具。
 *
 * 每个用例自建自清，不用「跑前 truncate 全库」—— 后者一旦
 * DATABASE_URL 配错就会清空生产库，风险不对称。
 */
import { db } from "#prisma/db";
import { hashPassword } from "#lib/auth/password";
import {
  withRequest,
  callServerFn,
  callServerFnValidated,
  callServerFnResult,
  callServerFnResultValidated,
  lastResponseStatus,
  type CallContext,
} from "./request";

let seq = 0;

/** 生成唯一邮箱（时间戳 + 序号，避免并发用例撞车）。 */
export function uniqueEmail(prefix = "test"): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}@example.com`;
}

export const TEST_PASSWORD = "testpass123";

/** 直接建用户，绕过注册流程（用于「已有用户」为前置条件的用例）。 */
export async function createUser(
  opts: {
    email?: string;
    password?: string;
    name?: string;
    verified?: boolean;
    role?: "student" | "teacher" | "admin";
  } = {},
) {
  const email = opts.email ?? uniqueEmail();
  const password = opts.password ?? TEST_PASSWORD;
  const user = await db.orm.public.User.create({
    email,
    name: opts.name ?? "测试用户",
    passwordHash: await hashPassword(password),
    image: "",
    bio: "",
    ...(opts.role ? { role: opts.role } : {}),
    ...(opts.verified ? { emailVerifiedAt: new Date().toISOString() } : {}),
  });
  return { user, email, password };
}

/** 删掉用户及其关联数据（Device/Session/OTP 均以 userId 关联）。 */
export async function deleteUser(userId: string): Promise<void> {
  await db.orm.public.EmailVerificationToken.where((t) => t.userId.eq(userId)).delete();
  await db.orm.public.ResetToken.where((t) => t.userId.eq(userId)).delete();
  await db.orm.public.Session.where((s) => s.userId.eq(userId)).delete();
  await db.orm.public.Device.where((d) => d.userId.eq(userId)).delete();
  await db.orm.public.User.where({ id: userId }).delete();
}

/**
 * 清限速计数。
 *
 * 传 type（如 "register"）会清掉该维度**全部** key。
 *
 * ⚠️ 跨文件时这样写是危险的：多个测试文件并行执行（vitest 默认多 worker），
 * 而限速是 DB 型、跨文件共享的。一方清全量会把另一方的计数擦掉，
 * 表现为两类偶发失败：
 *   - “第 N 次应该被限速却通过了”（计数被清）
 *   - “操作过于频繁”（计数被别处累加）
 *
 * 所以**优先用 scopedClearRateLimit**，它只清本文件自己的 subject。
 * 只有在确实需要全库清空（如测「清空后第一次应放行」）时才用这个。
 *
 * key 的构造见 lib/auth/rate-limiter.ts 的 subjectKey()。
 */
export async function clearRateLimit(...types: string[]): Promise<void> {
  for (const t of types) {
    await db.orm.public.RateLimit.where((r) => r.key.like(`${t}%`)).delete();
  }
}

/**
 * 只清**当前测试文件自己的**限速计数。
 *
 * 这是跨文件安全的形式：每个测试文件用一个专属 IP（见各文件的 IP 常量），
 * 这里按该 IP 清，不会碰到别的文件。
 *
 * 同时清掉「空 subject」桶 —— 不传 ctx 的 serverFn 调用会让 subjectKey()
 * 跳过 undefined，key 变成 `register:`（无 `ip=` 段），与按 IP 清的不是
 * 同一个桶。漏掉它会让计数在整个文件里累积，跑到第 N 次就撞上限。
 *
 * 用法：
 *   const IP = "192.0.2.30";           // 文件顶部，各文件不重复
 *   await scopedClearRateLimit(IP, "resend");
 */
export async function scopedClearRateLimit(ip: string, ...types: string[]): Promise<void> {
  for (const t of types) {
    await db.orm.public.RateLimit.where((r) => r.key.eq(`${t}:ip=${ip}`)).delete();
    // 空 subject（未注入 IP 的调用）
    await db.orm.public.RateLimit.where((r) => r.key.eq(`${t}:`)).delete();
  }
}

/** 读用户当前的所有邮箱 OTP 记录（新→旧）。 */
export async function getEmailOtps(userId: string) {
  const rows = await db.orm.public.EmailVerificationToken.where((t) => t.userId.eq(userId)).all();
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** 读用户当前的所有重置 OTP 记录（新→旧）。 */
export async function getResetOtps(userId: string) {
  const rows = await db.orm.public.ResetToken.where((t) => t.userId.eq(userId)).all();
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** 读用户的 Session（单设备模型下最多一条）。 */
export async function getSessions(userId: string) {
  return db.orm.public.Session.where((s) => s.userId.eq(userId)).all();
}

/** 读用户的 Device（单设备模型下最多一条）。 */
export async function getDevices(userId: string) {
  return db.orm.public.Device.where((d) => d.userId.eq(userId)).all();
}

export {
  withRequest,
  callServerFn,
  callServerFnValidated,
  callServerFnResult,
  callServerFnResultValidated,
  lastResponseStatus,
  type CallContext,
};
