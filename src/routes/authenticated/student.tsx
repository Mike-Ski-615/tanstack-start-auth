import { createFileRoute, redirect } from "@tanstack/react-router";
import { ROLE_HOME } from "#lib/auth/current-user";
import { LoadingPage } from "#components/status/authenticated/student/loading";
import { ErrorPage } from "#components/status/authenticated/student/error";
import { NotFoundPage } from "#components/status/authenticated/student/not-found";

export const Route = createFileRoute("/authenticated/student")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: StudentPage,
  beforeLoad: ({ context }) => {
    // 不是本工作台的角色时，跳回**他自己**的默认工作台（而非对家）。
    // 用 ROLE_HOME 而非写死目标：新增角色时这里不用改，
    // 也不会出现「admin 访问 teacher 页 → 跳到 student」这种乱跳。
    if (context.user.role !== "student") {
      throw redirect({ to: ROLE_HOME[context.user.role] });
    }
  },
});

function StudentPage() {
  const { user } = Route.useRouteContext();

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold">学生</h1>
      <p className="mt-2">欢迎，{user.name}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </section>
  );
}
