import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ROLE_HOME } from "#lib/auth/current-user";
import { useContentWidth, CONTENT_WIDTH_CLASS } from "#provider/content-width-provider";
import { LoadingPage } from "#components/status/authenticated/loading";
import { ErrorPage } from "#components/status/authenticated/error";
import { NotFoundPage } from "#components/status/authenticated/not-found";

/**
 * 管理员区的父布局。
 *
 * 它是 `/authenticated/admin` **及其子路由**（teachers / students）的共同
 * 外壳 —— 所以组件必须是 `<Outlet />`，否则子页面的内容会被这里的组件
 * 整个盖掉（表现为：访问 /admin/students 却只看到管理员的占位工作台）。
 *
 * 角色校验放在这里，子页面就不用各写一遍：不是 admin 一律送回自己的
 * 工作台。访问 /admin 本身时，redirect 到教师管理（管理区的首页）。
 */
export const Route = createFileRoute("/authenticated/admin")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: AdminLayout,
  beforeLoad: ({ context, location }) => {
    if (context.user.role !== "admin") {
      throw redirect({ to: ROLE_HOME[context.user.role] });
    }

    // 管理区首页：默认进教师管理
    if (location.pathname === "/authenticated/admin") {
      throw redirect({ to: "/authenticated/admin/teachers" });
    }
  },
});

function AdminLayout() {
  // 主内容区（authenticated.tsx）不提供 padding —— 由各页面/布局自己给。
  // 放在父布局上，将来加子页不用每个都记得写。
  //
  // 宽度由 header 上的切换按钮控制。管理表格是宽内容，默认通栏最合适。
  const { width } = useContentWidth();

  return (
    <div className={`p-4 sm:p-5 ${CONTENT_WIDTH_CLASS[width]}`}>
      <Outlet />
    </div>
  );
}
