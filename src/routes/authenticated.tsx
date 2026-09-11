import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "#lib/query-keys";
import { getUserFn } from "#server/user.functions";
import { ROLE_HOME } from "#lib/auth/current-user";
import { useLogoutMutation } from "#hooks/use-auth-mutations";
import { useSessionGuard } from "#hooks/use-session-guard";
import { useNewNotificationToast } from "#hooks/use-notifications";
import { LoadingPage } from "#components/status/authenticated/loading";
import { ErrorPage } from "#components/status/authenticated/error";
import { NotFoundPage } from "#components/status/authenticated/not-found";
import { SidebarInset, SidebarProvider } from "#components/ui/sidebar";
import { AppSidebar } from "#components/app-sidebar";
import { SidebarTrigger } from "#components/sidebar-trigger";
import { Header } from "#components/header/index";
import { useHotkeys } from "react-hotkeys-hook";

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

export const Route = createFileRoute("/authenticated")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  beforeLoad: async ({ location, context }) => {
    // ensureQueryData 而非直调 getUserFn：与 useSessionGuard 同 key，
    // SSR 预取的数据直接喂给客户端，进页后守钲的首次轮询命中缓存。
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions);

    if (!user) {
      throw redirect({ to: "/auth/login" });
    }

    if (location.pathname === "/authenticated") {
      throw redirect({ to: ROLE_HOME[user.role] });
    }

    return {
      user,
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const logoutMutation = useLogoutMutation();

  /**
   * 通知偏好从 query 读，不是从路由 context。
   *
   * context 里的 user 是 beforeLoad 那一刻的快照 —— 用户在设置页改了开关、
   * mutation 失效了 query 缓存，context 不会跟着变，表现为「改了但弹窗行为
   * 没变」。其余字段（name/role 等）用 context 没问题，它们在本会话内不变。
   */
  const { data: freshUser } = useQuery(currentUserQueryOptions);

  // 会话守卫 — 其它设备登录 / 全局登出后跳登录页
  useSessionGuard();

  /*
   * 新通知到达时弹 toast（开关在设置页，关掉就完全不打扰）。
   *
   * 这里**故意**用 `?? true` 而不写 isPending / error 分支：它读的是一个布尔
   * 偏好，且不向用户展示任何数据 —— 读不到时「照旧弹」是安全的默认值
   * （宁可多弹一次，也不要静默地不再提醒）。真正的会话失效已由上面的
   * useSessionGuard 处理（它会跳登录页并提示）。
   *
   * 对比：settings/bell.tsx 里同一个值就**必须**拦状态 —— 那里它是一个开关
   * 的 checked，渲染错值会让用户误以为自己的配置变了。
   */
  useNewNotificationToast(freshUser?.notifyOnNewMessage ?? true);

  // Ctrl + Shift + L 退出登录
  useHotkeys("ctrl+shift+l", () => logoutMutation.mutate(), {
    preventDefault: true,
  });

  return (
    <SidebarProvider>
      <AppSidebar user={user} />

      <SidebarInset>
        <SidebarTrigger />
        <Header role={user.role} />
        <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
