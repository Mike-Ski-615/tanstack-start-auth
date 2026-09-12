import { db } from "#prisma/db";
import { generateOtp, hashOtp } from "#lib/auth/otp";
import { consumeOtp, type OtpResult } from "#lib/auth/otp-store";

const VERIFICATION_OTP_TTL_MS = 15 * 60 * 1000;

export async function createVerificationOtp(userId: string): Promise<string> {
  const otp = generateOtp();
  const tokenHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + VERIFICATION_OTP_TTL_MS).toISOString();
  const now = new Date().toISOString();

  const unverified = await db.orm.public.EmailVerificationToken.where((t) => t.userId.eq(userId))
    .where((t) => t.verifiedAt.isNull())
    .all();

  for (const t of unverified) {
    await db.orm.public.EmailVerificationToken.where({ id: t.id }).update({
      verifiedAt: now,
    });
  }

  await db.orm.public.EmailVerificationToken.create({
    userId,
    tokenHash,
    expiresAt,
  });

  return otp;
}

export async function verifyEmailOtp(userId: string, otp: string): Promise<OtpResult> {
  return consumeOtp(
    {
      findLive: (uid) =>
        db.orm.public.EmailVerificationToken.where((t) => t.userId.eq(uid))
          .where((t) => t.verifiedAt.isNull())
          .first(),

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
