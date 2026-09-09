import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";
import { hashToken } from "./token";

/**
 * 从请求中提取用户 ID + 会话 ID（用于 WebSocket 升级）。
 * 读取 session-token cookie → 查哈希 → 校验 sessionVersion → 返回 { userId, sessionId }。
 *
 * 返回 sessionId 用于：
 * 1. 单设备登录时，Session 被 revoke 后旧 WS 可被踢下线
 * 2. Presence 追踪：确保同一 Session 只有一个活跃 WS 连接
 */
export async function getUserIdFromRequest(
  request: Request,
): Promise<{ userId: Char<36>; sessionId: Char<36> } | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("session-token="));

  if (!match) return null;

  const token = match.slice("session-token=".length);
  const tokenHash = hashToken(token);

  const session = await db.orm.public.Session.where({ tokenHash }).first();

  if (!session) return null;
  if (session.revokedAt) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  // sessionVersion 校验
  const user = await db.orm.public.User.where({ id: session.userId as Char<36> }).first();
  if (!user || user.sessionVersion !== session.sessionVersion) return null;

  return {
    userId: session.userId as Char<36>,
    sessionId: session.id as Char<36>,
  };
}
