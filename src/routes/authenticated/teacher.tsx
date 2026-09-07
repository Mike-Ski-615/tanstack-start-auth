import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoadingPage } from "#components/status/_authenticated/loading";
import { ErrorPage } from "#components/status/_authenticated/error";
import { NotFoundPage } from "#components/status/_authenticated/not-found";

export const Route = createFileRoute("/authenticated/teacher")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: TeacherPage,
  beforeLoad: ({ context }) => {
    if (context.user.role !== "teacher") {
      throw redirect({
        to: "/authenticated/student",
      });
    }
  },
});

function TeacherPage() {
  const { user } = Route.useRouteContext();

  return (
    <section className="px-6 py-10">
      <h1 className="text-2xl font-bold">教师</h1>
      <p className="mt-2">欢迎，{user.name ?? user.email}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </section>
  );
}
