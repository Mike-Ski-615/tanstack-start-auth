import { createFileRoute, redirect } from "@tanstack/react-router";
import { getUserFn } from "../server/user.functions";

export const Route = createFileRoute("/_authenticated")({
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
