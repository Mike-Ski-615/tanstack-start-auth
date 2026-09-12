import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { ROLE_HOME, type Role } from "#lib/auth/current-user";
import { getUserFn, getUserById, type User } from "#server/user.functions";

export const currentUserQueryOptions = queryOptions({
  queryKey: ["current-user"] as const,
  queryFn: () => getUserFn(),
  retry: false,
});

export function getCachedCurrentUser(queryClient: QueryClient): User | null {
  return queryClient.getQueryData<User | null>(currentUserQueryOptions.queryKey) ?? null;
}

export function requireRole(queryClient: QueryClient, role: Role): void {
  const user = getCachedCurrentUser(queryClient);
  if (!user) throw redirect({ to: "/auth/login" });
  if (user.role !== role) throw redirect({ to: ROLE_HOME[user.role] });
}

export const userByIdQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["user", userId] as const,
    queryFn: () => getUserById({ data: { userId } }),
  });
