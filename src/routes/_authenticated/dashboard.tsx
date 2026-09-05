import { Button } from "#components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { logout } from "#server/logout.functions";
import { LoadingPage } from "#components/status/_authenticated/dashboard/loading";
import { ErrorPage } from "#components/status/_authenticated/dashboard/error";
import { NotFoundPage } from "#components/status/_authenticated/dashboard/not-found";

export const Route = createFileRoute("/_authenticated/dashboard")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  return (
    <>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <p className="mt-2">Welcome, {user.name ?? user.email}</p>

      <p className="text-sm text-muted-foreground">{user.email}</p>
      <Button
        onClick={async () => {
          await logout();
          navigate({ to: "/" });
        }}
      >
        登出
      </Button>
    </>
  );
}
