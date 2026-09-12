import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

export function ErrorPage({ reset }: Pick<ErrorComponentProps, "reset">) {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">学生列表加载失败</h1>
      <p className="text-sm text-muted-foreground">
        没能取到学生数据。可以重试，或先回到教师管理。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/authenticated/admin/teachers"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          回教师管理
        </Link>
      </div>
    </div>
  );
}
