import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/authenticated/bell")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/authenticated/bell"!</div>;
}
