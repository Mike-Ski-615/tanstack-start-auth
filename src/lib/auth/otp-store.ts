import { hashOtp, MAX_OTP_ATTEMPTS } from "#lib/auth/otp";

export interface OtpRecord {
  id: string;
  tokenHash: string;
  attempts: number;
  expiresAt: string;
}

export interface OtpStore {
  findLive(userId: string): Promise<OtpRecord | null>;
  invalidate(id: string): Promise<void>;
  bumpAttempts(id: string, next: number): Promise<void>;
  onSuccess?(userId: string): Promise<void>;
}

export type OtpResult =
  { ok: true; userId: string } | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

export async function consumeOtp(store: OtpStore, userId: string, otp: string): Promise<OtpResult> {
  const now = new Date();

  const record = await store.findLive(userId);
  if (!record) return { ok: false, reason: "invalid" };

  if (new Date(record.expiresAt).getTime() < now.getTime()) {
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await store.invalidate(record.id);
    return { ok: false, reason: "too_many_attempts" };
  }

  if (record.tokenHash !== hashOtp(otp)) {
    const next = record.attempts + 1;
    const exhausted = next >= MAX_OTP_ATTEMPTS;

    await store.bumpAttempts(record.id, next);
    if (exhausted) await store.invalidate(record.id);

    return {
      ok: false,
      reason: exhausted ? "too_many_attempts" : "invalid",
    };
  }

  await store.invalidate(record.id);
  await store.onSuccess?.(userId);

  return { ok: true, userId };
}
