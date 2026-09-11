import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 设置区错误（/authenticated/settings）。
 *
 * 整个设置区是 Dialog（h-[min(80vh,500px)]），内容在
 * `min-h-0 flex-1 overflow-y-auto p-5` 里，所以：
 *   - 不用 min-h-svh（会撑破弹窗高度）；
 *   - 不再加 padding（外层 p-5 已有）；
 *   - 用 h-full 在滚动区内居中。
 *
 * 退路是 `/authenticated` —— 关闭弹窗回到工作台。设置本身是个弹窗，
 * "退出"的语义就是回上一层，而不是跳首页。
 */
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
