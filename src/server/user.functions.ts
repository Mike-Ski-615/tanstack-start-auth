import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { z } from "zod";
import { db } from "#prisma/db";
import { getCurrentUser } from "#lib/auth/guard";

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
  image: string | null;
  bio: string | null;
  role: "teacher" | "student";
  createdAt: string;
  status: "online" | "offline";
  sessionVersion: number;
};

/** 公开字段列表，getUserById 用它来投影。 */
const PUBLIC_COLUMNS = [
  "id",
  "email",
  "name",
  "image",
  "bio",
  "role",
  "createdAt",
  "status",
  "sessionVersion",
] as const;

/**
 * 当前登录用户（文档模式）：通过 guard 校验会话 → 返回公开形态。
 *
 * 投影发生在查询层，passwordHash 永不离开服务端。
 * 会话无效或用户不存在均返回 null。
 */
export const getUserFn = createServerFn({
  method: "GET",
}).handler(async (): Promise<User | null> => {
  // 个性化响应依赖当前会话，禁止任何缓存（登出/换号后不该吃到旧 user）
  setResponseHeader("Cache-Control", "no-store");

  return getCurrentUser();
});

const userIdSchema = z.object({
  userId: z.string().min(1),
});

/**
 * 按 id 取任意用户的公开形态（含 basic + 在线态），
 * /authenticated/users/$userId 用它来渲染目标用户主页。
 *
 * 只要求"已登录"即可查（会话无自界→任何登录用户可见任意用户）。
 */
export const getUserById = createServerFn({
  method: "GET",
})
  .validator(userIdSchema)
  .handler(async ({ data }): Promise<User | null> => {
    const currentUser = await getCurrentUser();
    if (!currentUser) return null;

    return db.orm.public.User.where({ id: data.userId as Char<36> })
      .select(...PUBLIC_COLUMNS)
      .first();
  });
