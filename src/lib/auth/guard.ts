import type { Char } from "@prisma/orm-postgres/target/codec-types";
import type { User } from "#server/user.functions";
import { getSessionToken, clearSessionCookie } from "./session";
import { validateSession } from "./session-manager";
import { touchLastSeen } from "./device";
import { db } from "#prisma/db";

/**
 * 请求守卫：校验会话 → 返回当前用户。
 * 会话无效时清除 cookie 并返回 null。
 *
 * 副作用：节流更新 Device.lastSeenAt（5 分钟一次）。
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = getSessionToken();
  if (!token) return null;

  const session = await validateSession(token);
  if (!session) {
    clearSessionCookie();
    return null;
  }

  const user = await db.orm.public.User.where({ id: session.userId as Char<36> })
    .select(
      "id",
      "email",
      "name",
      "image",
      "bio",
      "role",
      "createdAt",
      "status",
      "sessionVersion",
      "emailVerifiedAt",
    )
    .first();

  if (!user) {
    clearSessionCookie();
    return null;
  }

  // 节流更新 lastSeenAt（不阻塞请求）
  void touchLastSeen(session.deviceId as Char<36>);

  return user;
}
