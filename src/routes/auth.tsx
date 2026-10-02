import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionFn } from "#server/session.functions";
import { LoadingPage } from "#components/status/auth/loading";
import { ErrorPage } from "#components/status/auth/error";
import { NotFoundPage } from "#components/status/auth/not-found";

export const Route = createFileRoute("/auth")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  beforeLoad: async () => {
    const session = await getSessionFn();
    if (session) {
      throw redirect({ to: "/authenticated" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </main>
  );
}
