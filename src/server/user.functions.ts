import { createServerFn } from "@tanstack/react-start";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";
import { useAppSession } from "#lib/session";

/**
 * 当前登录用户的唯一公开形态：投影发生在源头，passwordHash 不出本模块。
 *
 * id 声明为 Char<36>（品牌类型，运行时就是普通 string），
 * 从 ORM 查询一路贯穿到客户端路由 context，无需转换。
 */
export type User = {
  id: Char<36>;
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

  const user = await db.orm.public.User.where({ id: userId })
    .select("id", "email", "name", "image", "bio")
    .first();

  if (!user) return null;

  return user;
});
