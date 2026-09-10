import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { db } from "#prisma/db";
import { getCurrentUser } from "#lib/auth/guard";
import { PUBLIC_COLUMNS, type User } from "#lib/auth/current-user";

// 客户端组件继续从本模块 import User，不必知道它搬去了叶子模块。
export type { User };

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

    const user = await db.orm.public.User.where({ id: data.userId })
      .select(...PUBLIC_COLUMNS)
      .first();

    if (!user) return null;

    return user;
  });
