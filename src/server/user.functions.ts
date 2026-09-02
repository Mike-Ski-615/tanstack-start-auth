import { createServerFn } from "@tanstack/react-start";
import { db } from "#prisma/db";
import { uuid } from "#prisma/uuid";
import { useAppSession } from "#lib/session";

/**
 * 当前登录用户的唯一公开形态：投影发生在源头，passwordHash 不出本模块。
 *
 * id 统一为普通 string：Char<36> 品牌已被隔离在 #prisma/uuid 的
 * 唯一强转接缝里，不出现在应用层签名中。
 */
export type User = {
  id: string;
  email: string;
  name: string;
  image: string;
  bio: string;
};

/**
 * 当前登录用户（文档模式）：从会话读 userId → 查库 → 返回公开形态。
 *
 * 投影发生在查询层：select 只取公开字段，passwordHash 永不离开服务端。
 * 无会话或用户不存在均返回 null。
 */
export const getUserFn = createServerFn({
  method: "GET",
}).handler(async (): Promise<User | null> => {
  const session = await useAppSession();
  const userId = session.data.userId;

  if (!userId) return null;

  const user = await db.orm.public.User.where({ id: uuid(userId) })
    .select("id", "email", "name", "image", "bio")
    .first();

  if (!user) return null;

  return user;
});
