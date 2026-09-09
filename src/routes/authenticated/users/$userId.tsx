import { createFileRoute, notFound } from "@tanstack/react-router";
import { LoadingPage } from "#components/status/authenticated/users/$userId/loading";
import { ErrorPage } from "#components/status/authenticated/users/$userId/error";
import { NotFoundPage } from "#components/status/authenticated/users/$userId/not-found";

import { UserView } from "#components/user/user-view";
import { getUserById } from "#server/user.functions";

export const Route = createFileRoute("/authenticated/users/$userId")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  loader: async ({ params }) => {
    const user = await getUserById({
      data: {
        userId: params.userId,
      },
    });

    if (!user) {
      throw notFound();
    }

    return user;
  },

  component: UserPage,
});

function UserPage() {
  const user = Route.useLoaderData();

  return <UserView user={user} />;
}
