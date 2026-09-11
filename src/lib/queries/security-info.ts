import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#lib/query-keys";
import { listSessionsFn } from "#server/sessions.functions";

/**
 * 会话 / 设备信息（隐私与安全页 + 账号页共用）。
 *
 * 抽成 queryOptions 的理由与 current-user.ts 相同：key 与 queryFn 成对定义，
 * 两处引用同一个常量。
 *
 * 之前两个页面各写一遍 `useQuery({ queryKey, queryFn })` —— 看起来一样，
 * 但是「碰巧一致」：任何一处加了 staleTime / select / 不同的 retry，
 * 两个页面读到的就是两份行为分叉的缓存数据（key 相同、选项不同）。
 */
export const securityInfoQueryOptions = queryOptions({
  queryKey: queryKeys.securityInfo,
  queryFn: () => listSessionsFn(),
});
