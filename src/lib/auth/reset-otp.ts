/**
 * 密码重置 OTP 管理。
 *
 * 与 email-verification.ts 并列：两者都是「创建 OTP + 校验 OTP」，
 * 各自绑定一张表（ResetToken / EmailVerificationToken）。
 * 放这里而非 session-manager，是因为重置 OTP 与「会话」没有关系 ——
 * 它只在「用户忘密码、还没建立任何会话」时使用。
 *
 * 15 分钟有效，一次性（usedAt 标记已使用），错误次数超限即作废。
 */

import { db } from "#prisma/db";
import { generateOtp, hashOtp, MAX_OTP_ATTEMPTS } from "./otp";

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 分钟

/** 创建密码重置 OTP：先作废该用户旧的重置 OTP，再生成一个新的。 */
export async function createResetOtp(userId: string): Promise<string> {
  const otp = generateOtp();
  const tokenHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  const now = new Date().toISOString();

  // 旧 OTP 一律作废，保证一个用户同一时刻只有一个可用重置 OTP
  const unused = await db.orm.public.ResetToken.where((t) =>
    t.userId.eq(userId),
  )
    .where((t) => t.usedAt.isNull())
    .all();

  for (const t of unused) {
    await db.orm.public.ResetToken.where({ id: t.id }).update({ usedAt: now });
  }

  await db.orm.public.ResetToken.create({
    userId,
    tokenHash,
    expiresAt,
  });

  return otp;
}

/** 密码重置 OTP 的校验结果（仅本模块内部使用，不外传）。 */
type VerifyResetOtpResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

/**
 * 校验密码重置 OTP。
 *
 * 与邮箱验证同一套逻辑：6 位数字必须计错误次数（见 MAX_OTP_ATTEMPTS），
 * 否则限速之外的暴力枚举仍能撞开。必须先按 userId 取记录再比对，
 * 不能按 otp 查 —— 百万级空间下不同用户可能撞到同一个值。
 */
export async function verifyResetOtp(
  userId: string,
  otp: string,
): Promise<VerifyResetOtpResult> {
  const now = new Date();

  const record = await db.orm.public.ResetToken.where((t) =>
    t.userId.eq(userId),
  )
    .where((t) => t.usedAt.isNull())
    .first();

  if (!record) return { ok: false, reason: "invalid" };
  if (new Date(record.expiresAt).getTime() < now.getTime()) {
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await db.orm.public.ResetToken.where({ id: record.id }).update({
      usedAt: now.toISOString(),
    });
    return { ok: false, reason: "too_many_attempts" };
  }

  if (record.tokenHash !== hashOtp(otp)) {
    const next = record.attempts + 1;
    await db.orm.public.ResetToken.where({ id: record.id }).update({
      attempts: next,
      ...(next >= MAX_OTP_ATTEMPTS ? { usedAt: now.toISOString() } : {}),
    });
    return {
      ok: false,
      reason: next >= MAX_OTP_ATTEMPTS ? "too_many_attempts" : "invalid",
    };
  }

  await db.orm.public.ResetToken.where({ id: record.id }).update({
    usedAt: now.toISOString(),
  });

  return { ok: true, userId };
}
