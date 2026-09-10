// src/lib/queries/user-by-id.ts
import { queryOptions } from "@tanstack/react-query";
import { getUserById } from "#server/user.functions";

/** 按 id 查用户资料（未登录或不存在均返回 null）。 */
export function userByIdQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ["user", userId],
    queryFn: () => getUserById({ data: { userId } }),
  });
}
