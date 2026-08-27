import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUserFn } from "../server/current-user.functions";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUserFn();

    if (!user) {
      throw redirect({
        to: "/auth/login",
        search: {
          redirect: location.href,
        },
      });
    }

    return {
      user,
    };
  },
  // component 默认为 Outlet，无需声明
});
