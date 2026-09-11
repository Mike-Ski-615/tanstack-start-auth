import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#lib/query-keys";
import { getUserById } from "#server/user.functions";

/** 按 id 查用户资料（未登录或不存在均返回 null）。 */
export function userByIdQueryOptions(userId: string) {
  return queryOptions({
    // 走 queryKeys 而非裸写 ["user", userId]：集中定义是防重复请求的手段，
    // 散着写字符串 key 时，beforeLoad 与组件里各写一个就永远命不中同一份缓存
    // （见 query-keys.ts 的说明）。
    queryKey: queryKeys.userById(userId),
    queryFn: () => getUserById({ data: { userId } }),
  });
}
