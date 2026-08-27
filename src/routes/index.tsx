import { Button } from "#components/ui/button";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main>
      <header className="bg-red-500 text-white p-4">Hello World</header>
      <div className="flex gap-3 p-4">
        <Button asChild>
          <Link to="/auth/login">登录</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/auth/register">注册</Link>
        </Button>
      </div>
    </main>
  );
}
