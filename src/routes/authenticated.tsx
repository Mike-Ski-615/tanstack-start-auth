import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getUserFn } from "#server/user.functions";
import { LoadingPage } from "#components/status/_authenticated/loading";
import { ErrorPage } from "#components/status/_authenticated/error";
import { NotFoundPage } from "#components/status/_authenticated/not-found";
import { SidebarProvider } from "#components/ui/sidebar";
import { AppSidebar } from "#components/app-sidebar";
import { SidebarTrigger } from "#components/sidebar-trigger";

export const Route = createFileRoute("/authenticated")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  beforeLoad: async ({ location }) => {
    const user = await getUserFn();

    if (!user) {
      throw redirect({ to: "/auth/login" });
    }

    if (user.role === "teacher" && location.pathname !== "/authenticated/teacher") {
      throw redirect({ to: "/authenticated/teacher" });
    }

    if (user.role === "student" && location.pathname !== "/authenticated/student") {
      throw redirect({ to: "/authenticated/student" });
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
      <SidebarTrigger />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
