import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6">
      <h1 className="text-2xl font-semibold text-foreground">出错了</h1>
      <p className="max-w-md text-center text-muted-foreground">页面加载时出现问题，请稍后重试。</p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          回到首页
        </Link>
      </div>
    </main>
  );
}
