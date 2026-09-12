import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div
      className={`flex flex-1 flex-col items-start gap-3 p-4 sm:p-5 ${SIDEBAR_GUTTER_CLASS} ${CONTENT_WIDTH_CLASS}`}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">管理区出错了</h1>
      <p className="text-sm text-muted-foreground">
        管理页面没能加载出来。可以重试，或先回到教师管理。
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
