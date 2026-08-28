import crypto from "node:crypto";
import { getRequestUrl } from "@tanstack/react-start/server";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";

import { issueSession } from "./session";
import { hashPassword } from "../password";
import { sendMail } from "../mail";

/**
 * 验证模块：注册邮箱验证 + 密码重置，共用一套验证令牌机制。
 *
 * 不变量：
 * - 单一性——每用户每 purpose 至多一个活令牌（签发新令牌先删旧的）
 * - 一次性——令牌命中即消费（删除）
 * - 硬门槛——未验证账号无法通过 authenticate（检查在 use-cases.ts）
 * - 重置蕴含验证——能收到重置邮件即证明邮箱所有权（见 ADR-0001）
 */

export type TokenPurpose = "verify_email" | "reset_password";

const TOKEN_TTL_SECONDS: Record<TokenPurpose, number> = {
  verify_email: 24 * 60 * 60,
  reset_password: 60 * 60,
};

const RESEND_COOLDOWN_SECONDS = 60;

export type VerifyEmailResult =
  | { ok: true }
  | { ok: false; error: "invalid_token" };

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: "invalid_token" };

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildLink(path: string, token: string): string {
  // 从当前请求推导 origin（测试的最小请求上下文为 http://localhost）
  const origin = new URL(getRequestUrl()).origin;
  return `${origin}${path}?token=${token}`;
}

/**
 * 为某用户签发指定用途的令牌并发邮件。
 *
 * 单一性：事务内先删该用户该用途的旧令牌再建新行。
 * 返回 false 表示处于重发冷却期（静默跳过，不更新不发送）。
 */
async function issueToken(
  userId: Char<36>,
  email: string,
  purpose: TokenPurpose,
): Promise<boolean> {
  const existing = await db.orm.public.Token.where({ userId, purpose }).first();

  if (existing) {
    const elapsed = Date.now() - new Date(existing.lastSentAt).getTime();
    if (elapsed < RESEND_COOLDOWN_SECONDS * 1000) {
      return false;
    }
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + TOKEN_TTL_SECONDS[purpose] * 1000,
  ).toISOString();

  await db.transaction(async (tx) => {
    await tx.orm.public.Token.where({ userId, purpose }).delete();
    await tx.orm.public.Token.create({
      tokenHash,
      purpose,
      userId,
      expiresAt,
      lastSentAt: now.toISOString(),
    });
  });

  const subject =
    purpose === "verify_email" ? "验证你的邮箱" : "重置你的密码";
  const path = purpose === "verify_email" ? "/auth/verify" : "/auth/reset";
  const action = purpose === "verify_email" ? "验证邮箱" : "重置密码";

  await sendMail(
    email,
    subject,
    [
      `点击下面的链接${action}（${TOKEN_TTL_SECONDS[purpose] / 3600} 小时内有效，仅可使用一次）：`,
      "",
      buildLink(path, token),
      "",
      "如果你没有发起此请求，可以安全地忽略这封邮件。",
    ].join("\n"),
  );

  return true;
}

/** 按明文令牌查找未过期的活令牌行。 */
async function findLiveToken(token: string, purpose: TokenPurpose) {
  const row = await db.orm.public.Token.where({
    tokenHash: hashToken(token),
    purpose,
  }).first();

  if (!row) return null;
  if (new Date(row.expiresAt) <= new Date()) return null;

  return row;
}

/**
 * 注册后发送验证邮件（enroll 内部调用）。
 */
export async function sendVerification(
  userId: Char<36>,
  email: string,
): Promise<void> {
  await issueToken(userId, email, "verify_email");
}

/**
 * 重发验证邮件。防枚举：无论邮箱是否存在、是否在冷却期，恒返回 ok。
 */
export async function resendVerification(
  email: string,
): Promise<{ ok: true }> {
  const user = await db.orm.public.User.where({ email }).first();

  if (user && user.verifiedAt === null) {
    await issueToken(user.id, email, "verify_email");
  }

  return { ok: true };
}

/**
 * 验证邮箱：消费令牌 → 标记 verified → 自动登录（验证即信任建立）。
 */
export async function verifyEmail(token: string): Promise<VerifyEmailResult> {
  const row = await findLiveToken(token, "verify_email");
  if (!row) return { ok: false, error: "invalid_token" };

  await db.transaction(async (tx) => {
    await tx.orm.public.User.where({ id: row.userId }).update({
      verifiedAt: new Date().toISOString(),
    });
    await tx.orm.public.Token.where({ id: row.id }).delete();
  });

  await issueSession(row.userId);

  return { ok: true };
}

/**
 * 请求密码重置。防枚举：无论邮箱是否存在，恒返回 ok 与同一客户端提示。
 */
export async function requestPasswordReset(
  email: string,
): Promise<{ ok: true }> {
  const user = await db.orm.public.User.where({ email }).first();

  if (user) {
    await issueToken(user.id, email, "reset_password");
  }

  return { ok: true };
}

/**
 * 重置密码：消费令牌 → 改密 → 标记 verified（重置蕴含验证，ADR-0001）
 * → 签发新 Session（签发即顶替自动撤销全部旧会话）→ 自动登录。
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  const row = await findLiveToken(token, "reset_password");
  if (!row) return { ok: false, error: "invalid_token" };

  const passwordHash = await hashPassword(newPassword);

  await db.transaction(async (tx) => {
    await tx.orm.public.User.where({ id: row.userId }).update({
      passwordHash,
      verifiedAt: new Date().toISOString(),
    });
    await tx.orm.public.Token.where({ id: row.id }).delete();
  });

  await issueSession(row.userId);

  return { ok: true };
}
