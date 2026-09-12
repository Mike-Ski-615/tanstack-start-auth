import { queryOptions } from "@tanstack/react-query";
import { listUsersByRoleFn } from "#server/admin.functions";
import type { ManagedRole } from "#lib/auth/current-user";

export const adminUsersQueryOptions = (role: ManagedRole) =>
  queryOptions({
    queryKey: ["admin-users", role] as const,
    queryFn: () => listUsersByRoleFn({ data: { role } }),
  });

export const adminUsersQueryKey = ["admin-users"] as const;
