/**
 * 邮箱验证 OTP 管理。
 *
 * 验证状态存于 User.emailVerifiedAt（账户状态），OTP 只负责验证操作。
 * 15 分钟有效，一次性（原子消费），错误次数超限即作废。
 */

import { db } from "#prisma/db";
import { generateOtp, hashOtp, MAX_OTP_ATTEMPTS } from "./otp";

/** OTP 有效期：6 位数字空间有限，不宜长时间暴露。 */
const VERIFICATION_OTP_TTL_MS = 15 * 60 * 1000; // 15 分钟

/**
 * 创建邮箱验证 OTP：先作废该用户所有未验证的旧 OTP，再生成一个新的。
 * 保证一个用户同一时刻只有一个可用 OTP。
 *
 * @returns 6 位数字 OTP（应通过邮件发送给用户）
 */
export async function createVerificationOtp(userId: string): Promise<string> {
  const otp = generateOtp();
  const tokenHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + VERIFICATION_OTP_TTL_MS).toISOString();
  const now = new Date().toISOString();

  // 令该用户所有未验证的旧 OTP 失效
  const unverified = await db.orm.public.EmailVerificationToken.where(
    (t) => t.userId.eq(userId),
  )
    .where((t) => t.verifiedAt.isNull())
    .all();

  for (const t of unverified) {
    await db.orm.public.EmailVerificationToken.where({ id: t.id }).update({
      verifiedAt: now,
    });
  }

  // 创建新 OTP
  await db.orm.public.EmailVerificationToken.create({
    userId,
    tokenHash,
    expiresAt,
  });

  return otp;
}

/** 邮箱验证 OTP 的校验结果。 */
export type VerifyOtpResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

/**
 * 校验邮箱验证 OTP。
 *
 * 流程：按 userId 取当前未消费的 OTP → 检查过期 / 错误次数 → 比对哈希。
 * 比对失败时 attempts + 1；达到上限则该 OTP 直接作废。
 *
 * 注意必须按 userId 查而非按 otp 查：OTP 空间只有 100 万，不同用户可能
 * 撞到同一个值，按 otp 查会命中别人的记录。
 */
export async function verifyEmailOtp(
  userId: string,
  otp: string,
): Promise<VerifyOtpResult> {
  const now = new Date();

  const record = await db.orm.public.EmailVerificationToken.where(
    (t) => t.userId.eq(userId),
  )
    .where((t) => t.verifiedAt.isNull())
    .first();

  if (!record) return { ok: false, reason: "invalid" };
  if (new Date(record.expiresAt).getTime() < now.getTime()) {
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    // 超限：直接作废，用户需重新发起
    await db.orm.public.EmailVerificationToken.where({ id: record.id }).update({
      verifiedAt: now.toISOString(),
    });
    return { ok: false, reason: "too_many_attempts" };
  }

  if (record.tokenHash !== hashOtp(otp)) {
    const next = record.attempts + 1;
    await db.orm.public.EmailVerificationToken.where({ id: record.id }).update({
      attempts: next,
      // 最后一次也判错时顺手作废，避免留下一个已耗尽的 OTP 记录
      ...(next >= MAX_OTP_ATTEMPTS ? { verifiedAt: now.toISOString() } : {}),
    });
    return {
      ok: false,
      reason: next >= MAX_OTP_ATTEMPTS ? "too_many_attempts" : "invalid",
    };
  }

  // 命中：标记消费 + 同步账户级验证状态
  await db.orm.public.EmailVerificationToken.where({ id: record.id }).update({
    verifiedAt: now.toISOString(),
  });
  await db.orm.public.User.where({ id: userId }).update({
    emailVerifiedAt: now.toISOString(),
  });

  return { ok: true, userId };
}

/**
 * 检查用户邮箱是否已验证（通过 User.emailVerifiedAt）。
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await db.orm.public.User.where({ id: userId })
    .select("emailVerifiedAt")
    .first();

  return user?.emailVerifiedAt != null;
}
