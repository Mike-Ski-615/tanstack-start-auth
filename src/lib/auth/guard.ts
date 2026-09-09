import type { Char } from "@prisma/orm-postgres/target/codec-types";
import type { User } from "#server/user.functions";
import { getSessionToken, clearSessionCookie } from "./session";
import { validateSession } from "./session-manager";
import { db } from "#prisma/db";

/**
 * 请求守卫：校验会话 → 返回当前用户。
 * 会话无效时清除 cookie 并返回 null。
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
      "connectedAt",
      "disconnectedAt",
    )
    .first();

  if (!user) {
    clearSessionCookie();
    return null;
  }

  return user;
}
