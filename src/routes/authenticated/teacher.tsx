import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { currentUserQueryOptions, requireRole } from "#lib/queries/user";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";
import { LoadingPage } from "#components/status/authenticated/teacher/loading";
import { ErrorPage } from "#components/status/authenticated/teacher/error";
import { NotFoundPage } from "#components/status/authenticated/teacher/not-found";

export const Route = createFileRoute("/authenticated/teacher")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: TeacherPage,
  beforeLoad: ({ context }) => {
    // 工作台准入：未登录 → 登录页；角色不符 → 回他自己的工作台
    requireRole(context.queryClient, "teacher");
  },
});

function TeacherPage() {
  const { data: user } = useQuery(currentUserQueryOptions);
  if (!user) return null;

  return (
    <section className={`p-4 ${SIDEBAR_GUTTER_CLASS} ${CONTENT_WIDTH_CLASS}`}>
      <h1 className="text-2xl font-bold">教师</h1>
      <p className="mt-2">欢迎，{user.name}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </section>
  );
}
