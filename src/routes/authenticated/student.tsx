import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoadingPage } from "#components/status/authenticated/student/loading";
import { ErrorPage } from "#components/status/authenticated/student/error";
import { NotFoundPage } from "#components/status/authenticated/student/not-found";

export const Route = createFileRoute("/authenticated/student")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: StudentPage,
  beforeLoad: ({ context }) => {
    if (context.user.role !== "student") {
      throw redirect({
        to: "/authenticated/teacher",
      });
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
