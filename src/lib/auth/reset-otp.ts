import { db } from "#prisma/db";
import { generateOtp, hashOtp } from "#lib/auth/otp";
import { consumeOtp, type OtpResult } from "#lib/auth/otp-store";

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

export async function createResetOtp(userId: string): Promise<string> {
  const otp = generateOtp();
  const tokenHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  const now = new Date().toISOString();

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

export async function verifyResetOtp(userId: string, otp: string): Promise<OtpResult> {
  return consumeOtp(
    {
      findLive: (uid) =>
        db.orm.public.ResetToken.where((t) => t.userId.eq(uid))
          .where((t) => t.usedAt.isNull())
          .first(),

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
