import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/authenticated/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/authenticated/profile"!</div>;
}
