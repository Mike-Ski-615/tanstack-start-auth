import { Button } from "#components/ui/button";
import { createFileRoute, isRedirect, useNavigate } from "@tanstack/react-router";
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
          try {
            await logout();
          } catch (error) {
            // 登出成功：server function 抛 redirect，客户端 RPC 原样抛回
            if (isRedirect(error)) {
              navigate({ to: "/" });
              return;
            }
            throw error;
          }
        }}
      >
        登出
      </Button>
    </main>
  );
}
