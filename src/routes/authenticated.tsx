import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { currentUserQueryOptions } from "#lib/queries/current-user";
import { ROLE_HOME } from "#lib/auth/current-user";
import { useLogoutMutation } from "#hooks/use-auth-mutations";
import { useSessionGuard } from "#hooks/use-session-guard";
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
  beforeLoad: async ({ location, context }) => {
    // ensureQueryData 而非直调 getUserFn：与 useSessionGuard 同 key，
    // SSR 预取的数据直接喂给客户端，进页后守钲的首次轮询命中缓存。
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions);

    if (!user) {
      throw redirect({ to: "/auth/login" });
    }

    if (location.pathname === "/authenticated") {
      throw redirect({ to: ROLE_HOME[user.role] });
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

  // 会话守卫 — 其它设备登录 / 全局登出后跳登录页
  useSessionGuard();

  // Ctrl + Shift + L 退出登录
  useHotkeys("ctrl+shift+l", () => logoutMutation.mutate(), {
    preventDefault: true,
  });

  return (
    <SidebarProvider>
      <AppSidebar user={user} />

      <SidebarInset>
        <SidebarTrigger />
        <Header role={user.role} />
        <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
