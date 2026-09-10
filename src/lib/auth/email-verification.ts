/**
 * 邮箱验证 OTP 管理。
 *
 * 验证状态存于 User.emailVerifiedAt（账户状态），OTP 只负责验证操作。
 * 15 分钟有效，一次性（原子消费），错误次数超限即作废。
 */

import { db } from "#prisma/db";
import { generateOtp, hashOtp } from "./otp";
import { consumeOtp, type OtpRecord, type OtpResult } from "./otp-store";

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
  const expiresAt = new Date(
    Date.now() + VERIFICATION_OTP_TTL_MS,
  ).toISOString();
  const now = new Date().toISOString();

  // 令该用户所有未验证的旧 OTP 失效
  const unverified = await db.orm.public.EmailVerificationToken.where((t) =>
    t.userId.eq(userId),
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

/**
 * 校验邮箱验证 OTP。
 *
 * 规则（过期判定、错误次数上限、作废时机）在 otp-store.consumeOtp 里，
 * 这里只声明本流程的表长什么样：查 EmailVerificationToken、以 verifiedAt
 * 作废、成功后额外同步 User.emailVerifiedAt。
 */
export async function verifyEmailOtp(
  userId: string,
  otp: string,
): Promise<OtpResult> {
  return consumeOtp(
    {
      findLive: (uid) =>
        db.orm.public.EmailVerificationToken.where((t) => t.userId.eq(uid))
          .where((t) => t.verifiedAt.isNull())
          .first() as Promise<OtpRecord | null>,

      invalidate: async (id) => {
        await db.orm.public.EmailVerificationToken.where({ id }).update({
          verifiedAt: new Date().toISOString(),
        });
      },

      bumpAttempts: async (id, next) => {
        await db.orm.public.EmailVerificationToken.where({ id }).update({
          attempts: next,
        });
      },

      // 邮箱验证特有：验证通过要同步账户级状态
      onSuccess: async (uid) => {
        await db.orm.public.User.where({ id: uid }).update({
          emailVerifiedAt: new Date().toISOString(),
        });
      },
    },
    userId,
    otp,
  );
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
