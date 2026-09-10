import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { userIdSchema } from "#schemas/auth";
import { db } from "#prisma/db";
import { getCurrentUser } from "#lib/auth/guard";
import { PUBLIC_COLUMNS, type User } from "#lib/auth/current-user";
import { getActivityForUser, type ActivityDay, type ActivityStats } from "#lib/activity";

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

/** 主页需要的全部数据：用户资料 + 活动。 */
export type UserProfile = {
  user: User;
  calendar: ActivityDay[];
  stats: ActivityStats;
};

/**
 * 按 id 取任意用户的公开资料与活动数据，
 * /authenticated/users/$userId 用它渲染目标用户主页。
 *
 * 只要求"已登录"即可查（会话无自界→任何登录用户可见任意用户）。
 * 邮箱也包含在公开投影里 —— 明确决策，见 CONTEXT.md。
 *
 * 资料与活动一次返回而非两个接口：主页两者都要，分两次请求只会多一次往返，
 * 且没有单独使用其一的场景。
 */
export const getUserById = createServerFn({
  method: "GET",
})
  .validator(userIdSchema)
  .handler(async ({ data }): Promise<UserProfile | null> => {
    const currentUser = await getCurrentUser();
    if (!currentUser) return null;

    const user = await db.orm.public.User.where({ id: data.userId })
      .select(...PUBLIC_COLUMNS)
      .first();

    if (!user) return null;

    const { calendar, stats } = await getActivityForUser(data.userId);

    return { user, calendar, stats };
  });
