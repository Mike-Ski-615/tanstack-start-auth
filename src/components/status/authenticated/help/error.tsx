import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 帮助文档错误（/authenticated/help）。
 *
 * 挂载在 SidebarInset 内，不用 min-h-svh；让开侧栏手柄（lg:ps-7）。
 *
 * 帮助页是纯静态内容（没有 loader），所以这里能出错基本是渲染层面的 ——
 * 重试通常有效。退路给工作台，让用户能继续干活。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col items-start gap-3 p-4 lg:ps-7">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">帮助文档加载失败</h1>
      <p className="text-sm text-muted-foreground">没能渲染帮助内容。可以重试，或先回到工作台。</p>
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
