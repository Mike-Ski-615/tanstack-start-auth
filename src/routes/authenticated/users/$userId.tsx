import { createFileRoute, notFound } from "@tanstack/react-router";
import { LoadingPage } from "#components/status/authenticated/$userId/loading";
import { ErrorPage } from "#components/status/authenticated/$userId/error";
import { NotFoundPage } from "#components/status/authenticated/$userId/not-found";

import { UserView } from "#components/user/user-view";
import { userByIdQueryOptions } from "#lib/queries/user";

export const Route = createFileRoute("/authenticated/users/$userId")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  loader: async ({ params, context }) => {
    // 走 Query 缓存而非裸调 server fn：同一用户重复访问直接命中，
    // 且加载态/错误态交给 Query 与 Router 统一的 pendingComponent。
    const profile = await context.queryClient.query({
      ...userByIdQueryOptions(params.userId),
      staleTime: "static",
    });

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
