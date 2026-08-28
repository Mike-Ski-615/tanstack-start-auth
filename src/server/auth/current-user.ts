import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";

import { readSession, type Session } from "./session";

/**
 * 当前用户的唯一公开形态。
 *
 * 投影发生在源头：passwordHash 等存储层字段永远不离开本模块。
 * authMiddleware 与 getCurrentUserFn 是本模块在两个 seam 上的 adapter。
 */
export type CurrentUser = {
  id: Char<36>;
  email: string;
  name: string;
  image: string;
  bio: string;
};

/**
 * 当前登录用户：Session 行（服务端使用，如登出需要的 session.id）
 * + 公开形态的 user。无会话或用户不存在时返回 null。
 */
export async function getCurrentUser(): Promise<{
  session: Session;
  user: CurrentUser;
} | null> {
  const session = await readSession();
  if (!session) return null;

  const user = await db.orm.public.User.where({
    id: session.userId,
  }).first();

  if (!user) return null;

  return {
    session,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      bio: user.bio,
    },
  };
}
