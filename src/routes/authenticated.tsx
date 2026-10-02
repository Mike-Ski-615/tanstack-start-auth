import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useHotkeys } from "react-hotkeys-hook";
import { getSessionFn } from "#server/session.functions";
import { useLogoutMutation } from "#hooks/use-auth-mutations";
import { AppSidebar } from "#components/app-sidebar";
import { SidebarTrigger } from "#components/sidebar-trigger";
import { Header } from "#components/header/index";
import { SidebarInset, SidebarProvider } from "#components/ui/sidebar";
import { LoadingPage } from "#components/status/authenticated/loading";
import { ErrorPage } from "#components/status/authenticated/error";
import { NotFoundPage } from "#components/status/authenticated/not-found";

export const Route = createFileRoute("/authenticated")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  beforeLoad: async () => {
    const session = await getSessionFn();
    if (!session) {
      throw redirect({ to: "/auth/login" });
    }
    return { session };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session } = Route.useRouteContext();
  const logoutMutation = useLogoutMutation();

  useHotkeys("ctrl+shift+l", () => logoutMutation.mutate(), {
    preventDefault: true,
  });

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />

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
