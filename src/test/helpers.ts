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
    ...(opts.verified ? { emailVerifiedAt: new Date().toISOString() } : {}),
  });
  return { user, email, password };
}

/** 删掉用户及其关联数据（Device/Session/OTP 均以 userId 关联）。 */
export async function deleteUser(userId: string): Promise<void> {
  await db.orm.public.EmailVerificationToken.where((t) =>
    t.userId.eq(userId),
  ).delete();
  await db.orm.public.ResetToken.where((t) => t.userId.eq(userId)).delete();
  await db.orm.public.Session.where((s) => s.userId.eq(userId)).delete();
  await db.orm.public.Device.where((d) => d.userId.eq(userId)).delete();
  await db.orm.public.User.where({ id: userId }).delete();
}

/**
 * 清掉指定维度的限速计数。
 *
 * 限速是 DB 型、跨用例持久 —— 同一 IP 跑多个「连续尝试」用例会互相干扰。
 * 需要干净窗口的用例在 beforeEach 里调它，而不是依赖全库清空。
 */
export async function clearRateLimit(...types: string[]): Promise<void> {
  for (const t of types) {
    await db.orm.public.RateLimit.where((r) => r.key.like(`${t}:%`)).delete();
  }
}

/** 读用户当前的所有邮箱 OTP 记录（新→旧）。 */
export async function getEmailOtps(userId: string) {
  const rows = await db.orm.public.EmailVerificationToken.where((t) =>
    t.userId.eq(userId),
  ).all();
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** 读用户当前的所有重置 OTP 记录（新→旧）。 */
export async function getResetOtps(userId: string) {
  const rows = await db.orm.public.ResetToken.where((t) =>
    t.userId.eq(userId),
  ).all();
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
  lastResponseStatus,
  type CallContext,
};
