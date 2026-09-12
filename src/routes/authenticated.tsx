import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { currentUserQueryOptions } from "#lib/queries/user";
import { notificationsUnreadQueryOptions } from "#lib/queries/notifications";
import { ROLE_HOME } from "#lib/auth/current-user";
import { useLogoutMutation } from "#hooks/use-auth-mutations";
import { useSessionGuard } from "#hooks/use-session-guard";
import { useNewNotificationToast } from "#hooks/use-notifications";
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
    const user = await context.queryClient.query({
      ...currentUserQueryOptions,
      staleTime: "static",
    });

    if (!user) {
      throw redirect({ to: "/auth/login" });
    }

    await context.queryClient
      .query({ ...notificationsUnreadQueryOptions, staleTime: "static" })
      .catch(() => {});

    if (location.pathname === "/authenticated") {
      throw redirect({ to: ROLE_HOME[user.role] });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: user } = useQuery(currentUserQueryOptions);
  const logoutMutation = useLogoutMutation();

  useSessionGuard();

  useNewNotificationToast(user?.notifyOnNewMessage ?? true);

  useHotkeys("ctrl+shift+l", () => logoutMutation.mutate(), {
    preventDefault: true,
  });

  if (!user) return null;

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
