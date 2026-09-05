import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getUserFn } from "#server/user.functions";
import { LoadingPage } from "#components/status/_authenticated/loading";
import { ErrorPage } from "#components/status/_authenticated/error";
import { NotFoundPage } from "#components/status/_authenticated/not-found";
import { SidebarProvider } from "#components/ui/sidebar";
import { AppSidebar } from "#components/app-sidebar";
import { SidebarTrigger } from "#components/sidebar-trigger";

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
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="grid min-h-full grid-cols-[auto_1fr]">
        <SidebarTrigger className="ml-1 self-center" />
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
