import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { getSessionFn } from "#server/session.functions";
import { authClient } from "#lib/auth-client";
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
  const navigate = useNavigate();

  function logout() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("已退出登录");
          navigate({ to: "/" });
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
      },
    });
  }

  useHotkeys("ctrl+shift+l", () => logout(), {
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
