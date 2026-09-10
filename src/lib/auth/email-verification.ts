/**
 * 邮箱验证令牌管理。
 *
 * 验证状态存于 User.emailVerifiedAt（账户状态），令牌只负责验证操作。
 * 24 小时有效，一次性（原子消费）。
 */

import { db } from "#prisma/db";
import { generateToken, hashToken } from "./token";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时

/**
 * 创建邮箱验证令牌。
 * 创建新令牌前，先令该用户所有未验证的旧令牌失效（verifiedAt 设为当前时间），
 * 保证一个用户只有一个当前有效的验证令牌。
 *
 * @returns 原始令牌（应通过邮件发送给用户）
 */
export async function createVerificationToken(userId: string): Promise<string> {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString();
  const now = new Date().toISOString();

  // 令该用户所有未验证的旧令牌失效
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

  // 创建新令牌
  await db.orm.public.EmailVerificationToken.create({
    userId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

/**
 * 原子消费邮箱验证令牌：存在 → 未过期 → 未验证 → 标记 verifiedAt + 设 User.emailVerifiedAt。
 *
 * 单条 SQL 完成「检查 + 更新」，杜绝并发双消费。
 * 返回 null 表示令牌不存在 / 已验证 / 已过期。
 */
export async function consumeVerificationToken(
  rawToken: string,
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const token = await db.orm.public.EmailVerificationToken.where({ tokenHash })
    .where((t) => t.verifiedAt.isNull())
    .where((t) => t.expiresAt.gt(now.toISOString()))
    .update({
      verifiedAt: now.toISOString(),
    });

  if (!token) return null;

  // 同步更新 User.emailVerifiedAt（账户级验证状态）
  await db.orm.public.User.where({ id: token.userId }).update({
    emailVerifiedAt: now.toISOString(),
  });

  return token.userId;
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
