import { queryOptions, type QueryClient } from "@tanstack/react-query";
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

/** 某个用户的公开资料（用户主页）。 */
export const userByIdQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["user", userId] as const,
    queryFn: () => getUserById({ data: { userId } }),
  });
