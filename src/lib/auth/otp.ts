// src/lib/auth/otp.ts
import { randomInt } from "node:crypto";
import { hashToken } from "#lib/auth/token";

/** OTP 位数。6 位 = 100 万种，必须配合尝试次数限制（见 MAX_OTP_ATTEMPTS）。 */
const OTP_DIGITS = 6;

/**
 * 单个 OTP 允许的最大错误次数。
 *
 * 6 位数字只有 100 万种组合，不限次数等于没有验证 —— 攻击者可以对同一个
 * OTP 连续试错直到命中，脚本几分钟就跑完全空间。超过此数即作废该 OTP，
 * 用户必须重新发起流程。
 */
export const MAX_OTP_ATTEMPTS = 5;

/**
 * 生成 6 位数字 OTP。
 *
 * 用 crypto.randomInt 而非 Math.random：后者可预测，且分布受实现影响。
 * padStart 保证前导零不被丢掉（"012345" 仍是 6 位）。
 */
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, "0");
}

/** OTP 落库前统一哈希（与其它令牌一致，不存明文）。 */
export function hashOtp(otp: string): string {
  return hashToken(otp);
}
