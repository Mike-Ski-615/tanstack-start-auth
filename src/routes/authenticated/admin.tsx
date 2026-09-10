import { createFileRoute, redirect } from "@tanstack/react-router";
import { ROLE_HOME } from "#lib/auth/current-user";
import { LoadingPage } from "#components/status/authenticated/teacher/loading";
import { ErrorPage } from "#components/status/authenticated/teacher/error";
import { NotFoundPage } from "#components/status/authenticated/teacher/not-found";

/**
 * 管理员工作台。
 *
 * 目前是占位页 —— `admin` 角色不比其他角色多任何权限，加它只是为了将来
 * 接入管理功能时有个落点。在这之前，它与 teacher / student 页功能等价
 * （都只是显示当前用户）。
 *
 * 复用 teacher 那套 status 组件是因为它们是通用文案（无角色字样），
 * 复制一份只是多三份要同步维护的文件。
 */
export const Route = createFileRoute("/authenticated/admin")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: AdminPage,
  beforeLoad: ({ context }) => {
    // 与 teacher / student 页同一套规则：不是本角色的工作台就跳回自己的。
    if (context.user.role !== "admin") {
      throw redirect({ to: ROLE_HOME[context.user.role] });
    }
  },
});

function AdminPage() {
  const { user } = Route.useRouteContext();

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold">管理员</h1>
      <p className="mt-2">欢迎，{user.name}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </section>
  );
}
