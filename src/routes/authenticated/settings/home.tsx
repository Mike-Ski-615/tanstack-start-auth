import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/authenticated/settings/home")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/authenticated/settings/home"!</div>;
}
