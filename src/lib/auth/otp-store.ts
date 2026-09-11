/**
 * 6 位 OTP 的消费规则（共用）。
 *
 * 邮箱验证与密码重置各有一张 OTP 表，但「怎么算验证通过」这件事完全相同：
 * 取未消费记录 → 未过期 → 错误次数未超限 → 比对哈希 → 失败记一次错误、
 * 超限即作废 → 成功则标记已消费。
 *
 * 这段逻辑原先在两处逐行重复（verifyEmailOtp / verifyResetOtp），差异只有
 * 四类：查哪张表、未消费的判据列、作废写哪一列、成功后是否要额外动作。
 * 把「表访问」与「作废动作」作为参数传入后，规则只写一遍。
 *
 * 为什么值得合并：这是安全规则（错误次数上限、过期判定、作废时机）。
 * 复制两份意味着改一处漏一处不报错、只是行为分叉 —— 而分叉出现在
 * 「什么时候作废验证码」上，是要靠审计才发现的。
 */

import { hashOtp, MAX_OTP_ATTEMPTS } from "#lib/auth/otp";

/** 一条 OTP 记录中，本规则需要读到的字段。 */
export interface OtpRecord {
  id: string;
  tokenHash: string;
  attempts: number;
  expiresAt: string;
}

/**
 * 一张 OTP 表的访问方式。
 *
 * 四个方法各自职责单一，让调用方（email-verification / reset-otp）
 * 只需声明「我的表长什么样」，不必重写规则。
 */
export interface OtpStore {
  /** 取该用户当前未消费的那条记录（没有则 null）。 */
  findLive(userId: string): Promise<OtpRecord | null>;
  /** 把它标记为已消费/已作废。 */
  invalidate(id: string): Promise<void>;
  /** 记录一次失败尝试。 */
  bumpAttempts(id: string, next: number): Promise<void>;
  /**
   * 校验通过后的额外动作（可选）。
   * 邮箱验证用它同步 User.emailVerifiedAt；密码重置不需要。
   */
  onSuccess?(userId: string): Promise<void>;
}

/** 校验结果。 */
export type OtpResult =
  { ok: true; userId: string } | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

/**
 * 按共用规则消费一枚 OTP。
 *
 * 必须先按 userId 取记录再比对，不能按 otp 查 —— 6 位数字只有 100 万种，
 * 百万级空间下不同用户可能撞到同一个值，按 otp 查会命中别人的记录。
 */
export async function consumeOtp(store: OtpStore, userId: string, otp: string): Promise<OtpResult> {
  const now = new Date();

  const record = await store.findLive(userId);
  if (!record) return { ok: false, reason: "invalid" };

  if (new Date(record.expiresAt).getTime() < now.getTime()) {
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    // 已超限（可能是上一次判错时就地作废，这里兜住残留记录）
    await store.invalidate(record.id);
    return { ok: false, reason: "too_many_attempts" };
  }

  if (record.tokenHash !== hashOtp(otp)) {
    const next = record.attempts + 1;
    const exhausted = next >= MAX_OTP_ATTEMPTS;

    // 先把这次失败计入 attempts，再决定是否同时作废 ——
    // 与合并前的行为一致：原实现在判错且超限时写的是
    // update({ attempts: next, <作废列>: now })，attempts 确实被写入了。
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
