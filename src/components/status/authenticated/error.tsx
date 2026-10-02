import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";
import { SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center gap-4 bg-background p-4 text-center sm:p-6 ${SIDEBAR_GUTTER_CLASS}`}
    >
      <h1 className="text-2xl font-semibold text-foreground">出错了</h1>
      <p className="max-w-md text-muted-foreground">
        这个页面没能加载出来，可能是网络波动。可以重试，或先回到首页。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/authenticated"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          回到首页
        </Link>
      </div>
    </div>
  );
}
