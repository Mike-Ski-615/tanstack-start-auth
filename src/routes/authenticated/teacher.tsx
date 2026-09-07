import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/authenticated/teacher")({
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
    <section>
      <h1 className="text-2xl font-bold">教师</h1>
      <p className="mt-2">欢迎，{user.name ?? user.email}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </section>
  );
}
