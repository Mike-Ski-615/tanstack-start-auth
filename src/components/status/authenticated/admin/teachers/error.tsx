import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

export function ErrorPage({ reset }: Pick<ErrorComponentProps, "reset">) {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">教师列表加载失败</h1>
      <p className="text-sm text-muted-foreground">
        没能取到教师数据。可以重试，或先回到你的工作台。
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
