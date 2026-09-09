import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getUserFn } from "#server/user.functions";
import { useLogoutMutation } from "#hooks/use-auth-mutations";
import { useWs } from "#hooks/use-ws";
import { LoadingPage } from "#components/status/authenticated/loading";
import { ErrorPage } from "#components/status/authenticated/error";
import { NotFoundPage } from "#components/status/authenticated/not-found";
import { SidebarInset, SidebarProvider } from "#components/ui/sidebar";
import { AppSidebar } from "#components/app-sidebar";
import { SidebarTrigger } from "#components/sidebar-trigger";
import { Header } from "#components/header/index";
import { useHotkeys } from "react-hotkeys-hook";

export const Route = createFileRoute("/authenticated")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  beforeLoad: async ({ location }) => {
    const user = await getUserFn();

    if (!user) {
      throw redirect({ to: "/auth/login" });
    }

    if (location.pathname === "/authenticated" && user.role === "teacher") {
      throw redirect({
        to: "/authenticated/teacher",
      });
    }

    if (location.pathname === "/authenticated" && user.role === "student") {
      throw redirect({
        to: "/authenticated/student",
      });
    }

    return {
      user,
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const logoutMutation = useLogoutMutation();

  // WebSocket 连接 — 实时在线状态 + 被踢通知
  useWs();

  // Ctrl + Shift + L 退出登录
  useHotkeys("ctrl+shift+l", () => logoutMutation.mutate(), {
    preventDefault: true,
  });

  return (
    <SidebarProvider>
      <AppSidebar user={user} />

      <SidebarInset>
        <SidebarTrigger />
        <Header />
        <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
