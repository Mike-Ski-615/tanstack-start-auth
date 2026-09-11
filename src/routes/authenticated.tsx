import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { currentUserQueryOptions } from "#lib/queries/user";
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

export const Route = createFileRoute("/authenticated")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  beforeLoad: async ({ location, context }) => {
    // query 而非直调 getUserFn：与 useSessionGuard 同 key，
    // SSR 预取的数据直接喂给客户端，进页后守卫的首次轮询命中缓存。
    const user = await context.queryClient.query({
      ...currentUserQueryOptions,
      staleTime: "static",
    });

    if (!user) {
      throw redirect({ to: "/auth/login" });
    }

    if (location.pathname === "/authenticated") {
      throw redirect({ to: ROLE_HOME[user.role] });
    }

    // user 不放进 route context —— 组件统一从 currentUserQueryOptions 读，
    // 否则 context 里的快照与 Query 真值会有两个来源（改资料/偏好后快照过期）。
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  // 唯一数据来源：currentUserQueryOptions。beforeLoad 已把数据放进这份缓存，
  // 这里读同一份 —— 改资料/改偏好后 mutation 失效它，侧栏与弹窗自动跟新。
  const { data: user } = useQuery(currentUserQueryOptions);
  const logoutMutation = useLogoutMutation();

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
  useNewNotificationToast(user?.notifyOnNewMessage ?? true);

  // Ctrl + Shift + L 退出登录
  useHotkeys("ctrl+shift+l", () => logoutMutation.mutate(), {
    preventDefault: true,
  });

  // beforeLoad 已确保登录态；这里兑底处理会话失效的瞬间（守卫会跳登录页）。
  if (!user) return null;

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
