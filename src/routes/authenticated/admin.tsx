import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ROLE_HOME } from "#lib/auth/current-user";
import { requireRole } from "#lib/queries/user";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";
import { LoadingPage } from "#components/status/authenticated/admin/loading";
import { ErrorPage } from "#components/status/authenticated/admin/error";
import { NotFoundPage } from "#components/status/authenticated/admin/not-found";

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
    // 工作台准入：未登录 → 登录页；角色不符 → 回他自己的工作台
    requireRole(context.queryClient, "admin");

    // 管理区首页：默认进教师管理。
    // 这是路由自己的事，不进 requireRole —— 而且它不能泛化：
    // student/teacher 的 ROLE_HOME 就是它们自己的路径，泛化会变成自我重定向。
    if (location.pathname === "/authenticated/admin") {
      throw redirect({ to: ROLE_HOME.admin });
    }
  },
});

function AdminLayout() {
  // 主内容区（authenticated.tsx）不提供 padding —— 由各页面/布局自己给。
  // 放在父布局上，将来加子页不用每个都记得写。
  //
  // 宽度不再由这里读 context 决定 —— content-region 配合 <html
  // data-content-width> 由 CSS 算，才能在首屏（水合前）就是对的宽度。
  return (
    <div className={`p-4 sm:p-5 ${SIDEBAR_GUTTER_CLASS} ${CONTENT_WIDTH_CLASS}`}>
      <Outlet />
    </div>
  );
}
