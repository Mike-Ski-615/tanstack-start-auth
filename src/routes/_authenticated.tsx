import { createFileRoute, redirect } from "@tanstack/react-router";
import { getUserFn } from "../server/user.functions";
import { LoadingPage } from "#components/status/_authenticated/loading";
import { ErrorPage } from "#components/status/_authenticated/error";
import { NotFoundPage } from "#components/status/_authenticated/not-found";

export const Route = createFileRoute("/_authenticated")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  beforeLoad: async () => {
    const user = await getUserFn();

    if (!user) {
      throw redirect({ to: "/auth/login" });
    }

    return {
      user,
    };
  },
  // component 默认为 Outlet，无需声明
});
