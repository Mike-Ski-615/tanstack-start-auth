import { Link } from "@tanstack/react-router";

/** 404：给回首页的退路，而非死胡同。 */
export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6">
      <h1 className="text-2xl font-semibold text-foreground">页面未找到</h1>
      <p className="text-muted-foreground">你访问的地址不存在或已被移动。</p>
      <Link to="/" className="text-sm font-medium underline underline-offset-4 hover:no-underline">
        回到首页
      </Link>
    </main>
  );
}
