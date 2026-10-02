import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

const authRoute = getRouteApi("/authenticated");

export const Route = createFileRoute("/authenticated/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = authRoute.useRouteContext();
  const user = session.user;

  return (
    <section className={`p-4 ${SIDEBAR_GUTTER_CLASS} ${CONTENT_WIDTH_CLASS}`}>
      <h1 className="text-2xl font-bold">首页</h1>
      <p className="mt-2">欢迎，{user.name}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </section>
  );
}
