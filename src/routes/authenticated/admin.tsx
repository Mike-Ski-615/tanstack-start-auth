import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ROLE_HOME } from "#lib/auth/current-user";
import { requireRole } from "#lib/queries/user";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";
import { LoadingPage } from "#components/status/authenticated/admin/loading";
import { ErrorPage } from "#components/status/authenticated/admin/error";
import { NotFoundPage } from "#components/status/authenticated/admin/not-found";

export const Route = createFileRoute("/authenticated/admin")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: AdminLayout,
  beforeLoad: ({ context, location }) => {
    requireRole(context.queryClient, "admin");

    if (location.pathname === "/authenticated/admin") {
      throw redirect({ to: ROLE_HOME.admin });
    }
  },
});

function AdminLayout() {
  return (
    <div className={`p-4 sm:p-5 ${SIDEBAR_GUTTER_CLASS} ${CONTENT_WIDTH_CLASS}`}>
      <Outlet />
    </div>
  );
}
