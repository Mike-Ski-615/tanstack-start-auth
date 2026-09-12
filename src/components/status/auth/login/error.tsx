import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">登录失败</h1>
      <p className="text-sm text-muted-foreground">
        没能完成登录，可能是网络问题。可以重试，或返回首页重新进入。
      </p>
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
    </div>
  );
}
