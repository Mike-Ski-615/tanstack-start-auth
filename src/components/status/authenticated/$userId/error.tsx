import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";
import { CONTENT_WIDTH_CLASS } from "#provider/content-width-provider";

/**
 * 用户主页错误（/authenticated/users/$userId）。
 *
 * 挂载点在 SidebarInset 内，不用 min-h-svh；padding 与 UserView 对齐
 * （p-4 sm:p-6 lg:p-8）+ 手柄留白。
 *
 * 退路给 `/authenticated`：这页是"某个用户"的主页，取不到时最合理的
 * 去处是自己的工作台（有人的上下文），而不是首页。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <main className="min-h-full min-w-0">
      <div className={`flex flex-col items-start gap-3 p-4 sm:p-6 lg:p-8 ${CONTENT_WIDTH_CLASS}`}>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">用户资料加载失败</h1>
        <p className="text-sm text-muted-foreground">
          没能取到这个用户的资料。可以重试，或先回到你的工作台。
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
    </main>
  );
}
