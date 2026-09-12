import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { ErrorPage } from "#components/status/authenticated/settings/appearance/error";
import { LoadingPage } from "#components/status/authenticated/settings/appearance/loading";
import { NotFoundPage } from "#components/status/authenticated/settings/appearance/not-found";

export const Route = createFileRoute("/authenticated/settings/appearance")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: () => <Outlet />,
  beforeLoad: ({ location }) => {
    if (location.pathname === "/authenticated/settings/appearance") {
      throw redirect({ to: "/authenticated/settings/appearance/accent" });
    }
  },
});
