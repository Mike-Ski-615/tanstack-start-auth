import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LoadingPage } from "#components/status/auth/loading";
import { ErrorPage } from "#components/status/auth/error";
import { NotFoundPage } from "#components/status/auth/not-found";

export const Route = createFileRoute("/auth")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: AuthLayout,
});

/**
 * auth 区的纯布局壳：只负责居中与宽度，不夹带任何内容。
 * 社交登录等页脚属于具体页面（login/register），不属于布局。
 */
function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  );
}
