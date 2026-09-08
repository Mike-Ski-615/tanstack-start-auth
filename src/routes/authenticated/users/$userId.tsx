import { createFileRoute, notFound } from "@tanstack/react-router";

import { UserView } from "#components/user/user-view";
import { getUserById } from "#server/user.functions";

export const Route = createFileRoute("/authenticated/users/$userId")({
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
