import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { currentUserQueryOptions } from "#lib/queries/current-user";
import { LoadingPage } from "#components/status/auth/loading";
import { ErrorPage } from "#components/status/auth/error";
import { NotFoundPage } from "#components/status/auth/not-found";

export const Route = createFileRoute("/auth")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      currentUserQueryOptions,
    );

    if (user) {
      throw redirect({ to: "/authenticated" });
    }
  },
  component: AuthLayout,
});

/**
 * auth 区的布局壳：已登录者一律 redirect 回仪表盘，
 * 其余只负责居中与宽度，不夹带任何内容。
 * 社交登录等页脚属于具体页面（login/register），不属于布局。
 */
function AuthLayout() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </main>
  );
}
