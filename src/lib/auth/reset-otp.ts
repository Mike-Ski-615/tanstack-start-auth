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
import { generateOtp, hashOtp } from "./otp";
import { consumeOtp, type OtpRecord, type OtpResult } from "./otp-store";

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 分钟

/** 创建密码重置 OTP：先作废该用户旧的重置 OTP，再生成一个新的。 */
export async function createResetOtp(userId: string): Promise<string> {
  const otp = generateOtp();
  const tokenHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  const now = new Date().toISOString();

  // 旧 OTP 一律作废，保证一个用户同一时刻只有一个可用重置 OTP
  const unused = await db.orm.public.ResetToken.where((t) => t.userId.eq(userId))
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

/**
 * 校验密码重置 OTP。
 *
 * 规则在 otp-store.consumeOtp 里，与邮箱验证共用。这里只声明本流程的表：
 * 查 ResetToken、以 usedAt 作废、成功时无额外动作。
 */
export async function verifyResetOtp(userId: string, otp: string): Promise<OtpResult> {
  return consumeOtp(
    {
      findLive: (uid) =>
        db.orm.public.ResetToken.where((t) => t.userId.eq(uid))
          .where((t) => t.usedAt.isNull())
          .first() as Promise<OtpRecord | null>,

      invalidate: async (id) => {
        await db.orm.public.ResetToken.where({ id }).update({
          usedAt: new Date().toISOString(),
        });
      },

      bumpAttempts: async (id, next) => {
        await db.orm.public.ResetToken.where({ id }).update({
          attempts: next,
        });
      },
    },
    userId,
    otp,
  );
}
