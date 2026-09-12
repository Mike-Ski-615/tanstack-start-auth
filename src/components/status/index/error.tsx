import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6">
      <h1 className="text-2xl font-semibold text-foreground">出错了</h1>
      <p className="max-w-md text-center text-muted-foreground">
        首页加载失败，可能是网络波动。可以重试，或直接前往登录。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/auth/login"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          前往登录
        </Link>
      </div>
    </main>
  );
}
