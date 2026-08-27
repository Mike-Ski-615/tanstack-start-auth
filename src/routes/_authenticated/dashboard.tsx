import { Button } from "#components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { logout } from "../../server/logout.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <p className="mt-2">Welcome, {user.name ?? user.email}</p>

      <p className="text-sm text-muted-foreground">{user.email}</p>
      <Button
        onClick={async () => {
          await logout();
          await navigate({
            to: "/auth/login",
          });
        }}
      >
        登出
      </Button>
    </main>
  );
}
