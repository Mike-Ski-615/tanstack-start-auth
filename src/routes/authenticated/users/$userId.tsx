import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import { LoadingPage } from "#components/status/authenticated/$userId/loading";
import { ErrorPage } from "#components/status/authenticated/$userId/error";
import { NotFoundPage } from "#components/status/authenticated/$userId/not-found";

import { UserView } from "#components/user/user-view";
import { getUserById } from "#server/user.functions";
import { queryKeys } from "#lib/query-keys";

/** 按 id 查用户资料（未登录或不存在均返回 null）。 */
function userByIdQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.userById(userId),
    queryFn: () => getUserById({ data: { userId } }),
  });
}

export const Route = createFileRoute("/authenticated/users/$userId")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  loader: async ({ params, context }) => {
    // 走 Query 缓存而非裸调 server fn：同一用户重复访问直接命中，
    // 且加载态/错误态交给 Query 与 Router 统一的 pendingComponent。
    const profile = await context.queryClient.ensureQueryData(userByIdQueryOptions(params.userId));

    if (!profile) {
      throw notFound();
    }

    return profile;
  },

  component: UserPage,
});

function UserPage() {
  const profile = Route.useLoaderData();

  return <UserView {...profile} />;
}
