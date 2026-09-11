import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import { queryKeys } from "#lib/query-keys";
import { getUserFn } from "#server/user.functions";
import { LoadingPage } from "#components/status/auth/loading";
import { ErrorPage } from "#components/status/auth/error";
import { NotFoundPage } from "#components/status/auth/not-found";

/**
 * 当前登录用户的查询定义。
 *
 * 注意：queryKey 必须与 useAuthCacheSync 里失效的那个完全一致
 * （两者都走 queryKeys.currentUser，不要自己另写字符串）。
 * 不一致的后果是登录后缓存没被重建，用户会被 beforeLoad 弹回登录页。
 */
const currentUserQueryOptions = queryOptions({
  queryKey: queryKeys.currentUser,
  queryFn: () => getUserFn(),
  // null 是「未登录」这个确定结果，不是错误，重试没有意义
  retry: false,
});

export const Route = createFileRoute("/auth")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions);

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
