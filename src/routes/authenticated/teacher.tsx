import { createFileRoute, redirect } from "@tanstack/react-router";
import { ROLE_HOME } from "#lib/auth/current-user";
import { useContentWidth, CONTENT_WIDTH_CLASS } from "#provider/content-width-provider";
import { LoadingPage } from "#components/status/authenticated/teacher/loading";
import { ErrorPage } from "#components/status/authenticated/teacher/error";
import { NotFoundPage } from "#components/status/authenticated/teacher/not-found";

export const Route = createFileRoute("/authenticated/teacher")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: TeacherPage,
  beforeLoad: ({ context }) => {
    // 不是本工作台的角色时，跳回**他自己**的默认工作台（而非对家）。
    // 用 ROLE_HOME 而非写死目标：新增角色时这里不用改，
    // 也不会出现「admin 访问 teacher 页 → 跳到 student」这种乱跳。
    if (context.user.role !== "teacher") {
      throw redirect({ to: ROLE_HOME[context.user.role] });
    }
  },
});

function TeacherPage() {
  const { user } = Route.useRouteContext();
  // 宽度由 header 上的切换按钮控制（见 ContentWidthProvider）
  const { width } = useContentWidth();

  return (
    <section className={`p-4 ${CONTENT_WIDTH_CLASS[width]}`}>
      <h1 className="text-2xl font-bold">教师</h1>
      <p className="mt-2">欢迎，{user.name}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </section>
  );
}
