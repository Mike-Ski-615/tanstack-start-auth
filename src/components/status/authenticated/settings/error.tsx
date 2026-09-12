import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">设置加载失败</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没能打开设置。可以重试，或关闭设置回到工作台。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/authenticated"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          回到工作台
        </Link>
      </div>
    </div>
  );
}
