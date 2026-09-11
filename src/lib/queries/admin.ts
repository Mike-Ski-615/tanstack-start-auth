import { queryOptions } from "@tanstack/react-query";
import { listUsersByRoleFn } from "#server/admin.functions";

/** 某个角色的用户列表。 */
export const adminUsersQueryOptions = (role: "student" | "teacher") =>
  queryOptions({
    queryKey: ["admin-users", role] as const,
    queryFn: () => listUsersByRoleFn({ data: { role } }),
  });

/**
 * 失效前缀。改角色会让同一个人从学生列表消失、出现在教师列表里，
 * 两边都必须失效 —— invalidate 这个前缀一次搞定。
 */
export const adminUsersQueryKey = ["admin-users"] as const;
