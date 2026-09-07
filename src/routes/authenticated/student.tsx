import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/authenticated/student")({
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
    <section>
      <h1 className="text-2xl font-bold">学生</h1>
      <p className="mt-2">欢迎，{user.name ?? user.email}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </section>
  );
}
