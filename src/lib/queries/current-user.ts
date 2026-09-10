// src/lib/queries/current-user.ts
import { queryOptions } from "@tanstack/react-query";
import { getUserFn } from "#server/user.functions";
import { queryKeys } from "#lib/query-keys";

/**
 * 当前登录用户的查询定义。
 *
 * `queryOptions` 而非裸对象：key 与 queryFn 成对定义，beforeLoad
 * （走 ensureQueryData）和 useSessionGuard（走 useQuery）引用同一个常量，
 * 天然共享同一份缓存 —— 不会出现两处各写一个 key、各查一次的情况。
 */
export const currentUserQueryOptions = queryOptions({
  queryKey: queryKeys.currentUser,
  queryFn: () => getUserFn(),
  // null 是「未登录」这个确定结果，不是错误，重试没有意义
  retry: false,
});
