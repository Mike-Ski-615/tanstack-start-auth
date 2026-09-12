import { randomInt } from "node:crypto";
import { hashToken } from "#lib/auth/token";

const OTP_DIGITS = 6;

export const MAX_OTP_ATTEMPTS = 5;

export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, "0");
}

export function hashOtp(otp: string): string {
  return hashToken(otp);
}
