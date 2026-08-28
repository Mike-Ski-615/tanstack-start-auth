import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";

import { emailOnlySchema, resetPasswordSchema } from "#schemas/auth";

import { issueSession } from "./auth/session";
import { hashPassword } from "./password";
import { sendMail } from "./mail";

/**
 * 密码重置用例。用例逻辑内联在各 server function 的 handler 中；
 * 令牌机制（生成/哈希/冷却/邮件）为模块私有基建。
 *
 * 不变量：
 * - 单一性——每用户至多一个活令牌（签发新令牌先删旧的）
 * - 一次性——令牌命中即消费（删除）
 */

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: "invalid_token" };

const TOKEN_PURPOSE = "reset_password";
const TOKEN_TTL_SECONDS = 60 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildLink(token: string): string {
  // 从当前请求推导 origin（测试的最小请求上下文为 http://localhost）
  const origin = new URL(getRequestUrl()).origin;
  return `${origin}/auth/reset?token=${token}`;
}

/**
 * 为用户签发重置令牌并发邮件。
 *
 * 单一性：事务内先删该用户的旧令牌再建新行。
 * 返回 false 表示处于重发冷却期（静默跳过，不更新不发送）。
 */
async function issueToken(userId: Char<36>, email: string): Promise<boolean> {
  const existing = await db.orm.public.Token.where({
    userId,
    purpose: TOKEN_PURPOSE,
  }).first();

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
    now.getTime() + TOKEN_TTL_SECONDS * 1000,
  ).toISOString();

  await db.transaction(async (tx) => {
    await tx.orm.public.Token.where({ userId, purpose: TOKEN_PURPOSE }).delete();
    await tx.orm.public.Token.create({
      tokenHash,
      purpose: TOKEN_PURPOSE,
      userId,
      expiresAt,
      lastSentAt: now.toISOString(),
    });
  });

  await sendMail(
    email,
    "重置你的密码",
    [
      `点击下面的链接重置密码（${TOKEN_TTL_SECONDS / 3600} 小时内有效，仅可使用一次）：`,
      "",
      buildLink(token),
      "",
      "如果你没有发起此请求，可以安全地忽略这封邮件。",
    ].join("\n"),
  );

  return true;
}

/** 按明文令牌查找未过期的活令牌行。 */
async function findLiveToken(token: string) {
  const row = await db.orm.public.Token.where({
    tokenHash: hashToken(token),
    purpose: TOKEN_PURPOSE,
  }).first();

  if (!row) return null;
  if (new Date(row.expiresAt) <= new Date()) return null;

  return row;
}

/**
 * 请求密码重置。防枚举：无论邮箱是否存在，恒返回 ok 与同一客户端提示。
 */
export const requestPasswordResetFn = createServerFn({
  method: "POST",
})
  .validator(emailOnlySchema)
  .handler(async ({ data: { email } }) => {
    const user = await db.orm.public.User.where({ email }).first();

    if (user) {
      await issueToken(user.id, email);
    }

    return { ok: true };
  });

/**
 * 重置密码：消费令牌 → 改密 → 签发新 Session
 * （签发即顶替自动撤销全部旧会话）→ 自动登录。
 */
export const resetPasswordFn = createServerFn({
  method: "POST",
})
  .validator(resetPasswordSchema)
  .handler(
    async ({ data: { token, password } }): Promise<ResetPasswordResult> => {
      const row = await findLiveToken(token);
      if (!row) return { ok: false, error: "invalid_token" };

      const passwordHash = await hashPassword(password);

      await db.transaction(async (tx) => {
        await tx.orm.public.User.where({ id: row.userId }).update({
          passwordHash,
        });
        await tx.orm.public.Token.where({ id: row.id }).delete();
      });

      await issueSession(row.userId);

      return { ok: true };
    },
  );
