import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 整站错误（__root）。
 *
 * 挂载点无外壳，是最后一道防线 —— 这里渲染不出来就整站白屏，
 * 所以内容刻意保持最小（不依赖任何 provider、不读 context）。
 *
 * 给「重试 + 回首页」两条路：整站级错误可能是路由/数据问题，
 * 重试往往能过；首页是绝对可达的落点（它挂在 __root 下，不走 beforeLoad）。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6">
      <h1 className="text-2xl font-semibold text-foreground">出错了</h1>
      <p className="max-w-md text-center text-muted-foreground">页面加载时出现问题，请稍后重试。</p>
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
    </main>
  );
}
