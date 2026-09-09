import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";
import { generateToken, hashToken } from "./token";

/** 将 Char<36> 转为 plain string 供 text 字段使用。 */
function plain(id: Char<36>): string {
  return id as unknown as string;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 分钟

export type Session = {
  id: Char<36>;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type ResetToken = {
  id: Char<36>;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

/** 创建会话：生成随机令牌 → 存哈希 → 返回原始令牌（存 cookie）。自动撤销旧会话。 */
export async function createSession(params: {
  userId: Char<36>;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<string> {
  const { userId, userAgent = null, ip = null } = params;

  // 单设备：撤销该用户所有旧会话
  await db.orm.public.Session.where({ userId }).update({
    revokedAt: new Date().toISOString(),
  });

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await db.orm.public.Session.create({
    userId: plain(userId),
    tokenHash,
    userAgent,
    ip,
    expiresAt,
  });

  return rawToken;
}

/** 校验会话令牌：查哈希 → 未过期 → 未撤销 → 返回会话。 */
export async function validateSession(
  rawToken: string,
): Promise<Session | null> {
  const tokenHash = hashToken(rawToken);

  const session = await db.orm.public.Session.where({ tokenHash }).first();

  if (!session) return null;
  if (session.revokedAt) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  return session;
}

/** 撤销指定令牌对应的会话。 */
export async function revokeSession(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await db.orm.public.Session.where({ tokenHash }).update({
    revokedAt: new Date().toISOString(),
  });
}

/** 撤销该用户所有会话（登出全部设备）。 */
export async function revokeAllSessions(userId: Char<36>): Promise<void> {
  await db.orm.public.Session.where({ userId }).update({
    revokedAt: new Date().toISOString(),
  });
}

/** 撤销该用户除当前令牌外的所有会话（改密时保留当前）。 */
export async function revokeOtherSessions(
  userId: Char<36>,
  currentRawToken: string,
): Promise<void> {
  const currentHash = hashToken(currentRawToken);
  const sessions = await db.orm.public.Session.where({ userId }).select(
    "id",
    "tokenHash",
    "revokedAt",
  ).all();
  for (const s of sessions) {
    if (s.tokenHash !== currentHash && !s.revokedAt) {
      await db.orm.public.Session.where({ id: s.id }).update({
        revokedAt: new Date().toISOString(),
      });
    }
  }
}

/** 列出该用户所有未撤销、未过期的活跃会话。 */
export async function listActiveSessions(
  userId: Char<36>,
): Promise<Session[]> {
  const now = new Date();
  const sessions = await db.orm.public.Session.where({ userId }).select(
    "id",
    "userId",
    "tokenHash",
    "userAgent",
    "ip",
    "createdAt",
    "updatedAt",
    "expiresAt",
    "revokedAt",
  ).all();

  return sessions
    .filter((s) => !s.revokedAt && new Date(s.expiresAt).getTime() > now.getTime())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** 清理过期会话（定时任务或手动调用）。 */
export async function purgeExpiredSessions(): Promise<number> {
  const now = new Date();
  const all = await db.orm.public.Session.where({}).select("id", "expiresAt").all();
  const toDelete = all.filter(
    (s) => new Date(s.expiresAt).getTime() < now.getTime(),
  );

  for (const s of toDelete) {
    await db.orm.public.Session.where({ id: s.id }).delete();
  }

  return toDelete.length;
}

/** 创建密码重置令牌。 */
export async function createResetToken(userId: Char<36>): Promise<string> {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await db.orm.public.ResetToken.create({
    userId: plain(userId),
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

/** 校验并使用重置令牌：存在 → 未过期 → 未使用 → 标记已使用 → 返回 userId。 */
export async function consumeResetToken(
  rawToken: string,
): Promise<Char<36> | null> {
  const tokenHash = hashToken(rawToken);

  const token = await db.orm.public.ResetToken.where({ tokenHash }).first();

  if (!token) return null;
  if (token.usedAt) return null;
  if (new Date(token.expiresAt).getTime() < Date.now()) return null;

  await db.orm.public.ResetToken.where({ id: token.id }).update({
    usedAt: new Date().toISOString(),
  });

  return token.userId as Char<36>;
}
