import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";
import { hashToken } from "./token";

/**
 * 从请求中提取用户 ID（用于 WebSocket 升级）。
 * 读取 session-token cookie → 查哈希 → 返回 userId。
 */
export async function getUserIdFromRequest(
  request: Request,
): Promise<Char<36> | null> {
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

  return session.userId as Char<36>;
}
