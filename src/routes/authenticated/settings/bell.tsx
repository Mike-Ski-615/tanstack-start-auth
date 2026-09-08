import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/authenticated/settings/bell")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/authenticated/settings/bell"!</div>;
}
