/**
 * 会话管理：两个核心原语。
 *
 * - createAuthenticatedSession(): 创建认证会话（Device + Session）
 * - invalidateAllSessions(): 全局失效所有会话（递增 sessionVersion）
 *
 * 所有认证操作（登录/注册/改密/重置）都基于这两个原语组合。
 */

import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";
import { generateToken, hashToken } from "./token";
import { ensureDevice } from "./device";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 分钟

export type Session = {
  id: Char<36>;
  userId: string;
  deviceId: string;
  tokenHash: string;
  sessionVersion: number;
  userAgent: string;
  ip: string;
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

// ============================================================
// 核心原语 1：创建认证会话
// ============================================================

/**
 * 创建认证会话：确保 Device → 删除旧 Session → 创建新 Session。
 *
 * 单设备保证：Device.userId UNIQUE → 一用户一设备。
 *
 * 职责边界：
 * - ensureDevice() 只管 Device
 * - createAuthenticatedSession() 只管 Session
 *
 * @returns { token, deviceKey, oldSessionId } 原始令牌 + deviceKey + 旧 sessionId（用于 kick WS）
 */
export async function createAuthenticatedSession(params: {
  userId: Char<36>;
  deviceKey?: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ token: string; deviceKey: string; oldSessionId: Char<36> | null }> {
  const { userId, deviceKey, userAgent = null, ip = null } = params;

  // 1. 确保 Device（单设备冲突时自动替换，不管 Session）
  const { device, deviceKey: finalDeviceKey } = await ensureDevice({
    userId,
    existingDeviceKey: deviceKey,
    userAgent,
    ip,
  });

  // 2. 查找旧 Session（用于 kick WS）
  const oldSession = await db.orm.public.Session.where({ userId: userId as unknown as string }).first();
  const oldSessionId = oldSession?.id as Char<36> | null;

  // 3. 删除旧 Session
  await db.orm.public.Session.where({ userId: userId as unknown as string }).delete();

  // 4. 读取当前 sessionVersion
  const user = await db.orm.public.User.where({ id: userId }).first();
  const sessionVersion = user?.sessionVersion ?? 0;

  // 5. 创建新 Session
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await db.orm.public.Session.create({
    userId: userId as unknown as string,
    deviceId: device.id as unknown as string,
    tokenHash,
    sessionVersion,
    userAgent: userAgent ?? "",
    ip: ip ?? "unknown",
    expiresAt,
  });

  return { token: rawToken, deviceKey: finalDeviceKey, oldSessionId };
}

// ============================================================
// 核心原语 2：全局失效所有会话
// ============================================================

/**
 * 递增 User.sessionVersion → 所有旧 Session 全局失效。
 * 用于改密、撤销全部会话。
 */
export async function invalidateAllSessions(userId: Char<36>): Promise<void> {
  // sessionVersion 递增 → 所有旧 Session 全局失效。
  //
  // 注意：Prisma 8 ORM 当前不暴露 expression-based update API，
  // 这里采用 read-modify-write。对于认证场景（改密、撤销全部），
  // 并发概率极低，且即使丢失一次递增，后果只是多失效一次（无害）。
  //
  // TODO: Prisma 8 正式支持 expression update 后，改为：
  //   UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1 WHERE id = ?
  const user = await db.orm.public.User.where({ id: userId }).select("sessionVersion").first();
  if (!user) return;

  await db.orm.public.User.where({ id: userId }).update({
    sessionVersion: user.sessionVersion + 1,
  });
}

// ============================================================
// 会话校验
// ============================================================

/**
 * 校验会话令牌：
 * 1. 查哈希 → 未过期 → 未撤销
 * 2. 检查 sessionVersion 是否匹配 User.sessionVersion
 */
export async function validateSession(rawToken: string): Promise<Session | null> {
  const tokenHash = hashToken(rawToken);

  const session = await db.orm.public.Session.where({ tokenHash }).first();
  if (!session) return null;
  if (session.revokedAt) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  // sessionVersion 校验
  const user = await db.orm.public.User.where({ id: session.userId as Char<36> }).first();
  if (!user || user.sessionVersion !== session.sessionVersion) return null;

  // 数据库有默认值，运行时不会是 null
  return session as unknown as Session;
}

// ============================================================
// 撤销
// ============================================================

/** 撤销指定令牌对应的会话。 */
export async function revokeSession(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await db.orm.public.Session.where({ tokenHash }).update({
    revokedAt: new Date().toISOString(),
  });
}

// ============================================================
// 清理
// ============================================================

/** 清理过期会话（定时任务或手动调用）。 */
export async function purgeExpiredSessions(): Promise<number> {
  const now = new Date().toISOString();
  // DB-side 条件删除，避免 O(N) 读取 + JS 过滤
  const deleted = await db.orm.public.Session.where(
    (s) => s.expiresAt.lt(now),
  ).deleteAndCount();
  return deleted;
}

// ============================================================
// 重置令牌
// ============================================================

/** 创建密码重置令牌。 */
export async function createResetToken(userId: Char<36>): Promise<string> {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await db.orm.public.ResetToken.create({
    userId: userId as unknown as string,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

/**
 * 校验并使用重置令牌：存在 → 未过期 → 未使用 → 标记已使用 → 返回 userId。
 *
 * 原子消费：WHERE 条件包含 tokenHash + usedAt IS NULL + expiresAt > now，
 * 单条 SQL 完成「检查 + 更新」，杜绝并发双消费。
 * 返回 null 表示令牌不存在 / 已使用 / 已过期。
 */
export async function consumeResetToken(rawToken: string): Promise<Char<36> | null> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const token = await db.orm.public.ResetToken.where({ tokenHash })
    .where((t) => t.usedAt.isNull())
    .where((t) => t.expiresAt.gt(now.toISOString()))
    .update({
      usedAt: now.toISOString(),
    });

  return (token?.userId as Char<36>) ?? null;
}
