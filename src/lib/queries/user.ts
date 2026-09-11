import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { ROLE_HOME, type Role } from "#lib/auth/current-user";
import { getUserFn, getUserById, type User } from "#server/user.functions";

/**
 * 当前登录用户（未登录为 null）。
 * beforeLoad / useSessionGuard / useAuthCacheSync / 设置页共用这一份。
 */
export const currentUserQueryOptions = queryOptions({
  queryKey: ["current-user"] as const,
  queryFn: () => getUserFn(),
  // null 是「未登录」这个确定结果，不是错误，重试没有意义
  retry: false,
});

/**
 * beforeLoad 守卫用：同步读已缓存的当前用户。
 *
 * 父布局（/authenticated）的 beforeLoad 已用同一份 queryOptions 把数据放进
 * 缓存，子路由的守卫在这里直接读缓存、不发请求。未缓存或未登录都返回 null，
 * 调用方据此 redirect。
 */
export function getCachedCurrentUser(queryClient: QueryClient): User | null {
  return queryClient.getQueryData<User | null>(currentUserQueryOptions.queryKey) ?? null;
}

/**
 * 工作台准入：要求当前会话属于某个角色。给工作台路由的 beforeLoad 用。
 *
 * 三步原先在三个工作台路由里各写一遍（student / teacher / admin），
 * 只有角色字面量不同：
 *
 *   读缓存里的 user → 没有就跳登录页 → 角色不符就跳回**他自己**的 ROLE_HOME
 *
 * 两处细节值得说明：
 *
 * - 读的是**缓存**而非发请求：父布局 `/authenticated` 的 beforeLoad 已用
 *   同一个 queryOptions 把数据放进去了，这里同步读同一份（与上面的
 *   getCachedCurrentUser 同一来源）。
 * - 角色不符时跳的是 `ROLE_HOME[user.role]`（他自己那个工作台），不是「对家」。
 *   否则会出现「admin 访问 teacher 页 → 跳到 student」这种乱跳。
 *
 * 刻意返回 void：beforeLoad 的返回值会进路由 context，而这个项目明确不让
 * user 进 context（见 routes/authenticated.tsx —— 否则 context 里的快照
 * 与 Query 真值会有两个来源，改资料后快照会过期）。
 *
 * 工作台**首页自己的**重定向不在这里（只有 admin 区需要，且它不能泛化：
 * student/teacher 的 ROLE_HOME 就是它们自己的路径，泛化会变成自我重定向）。
 */
export function requireRole(queryClient: QueryClient, role: Role): void {
  const user = getCachedCurrentUser(queryClient);
  if (!user) throw redirect({ to: "/auth/login" });
  if (user.role !== role) throw redirect({ to: ROLE_HOME[user.role] });
}

/** 某个用户的公开资料（用户主页）。 */
export const userByIdQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["user", userId] as const,
    queryFn: () => getUserById({ data: { userId } }),
  });
