import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * auth 区错误（/auth）。
 *
 * 渲染在 auth 布局的 max-w-sm 容器内，**不加 min-h-svh** ——
 * 父布局已经整屏居中了，再加一层会把内容顶下去并produce滚动条。
 *
 * 退路是回首页而非登录页：auth 区本身出错时，登录页可能同样不可用
 * （共享同一个布局与查询），首页是独立入口。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">出错了</h1>
      <p className="text-sm text-muted-foreground">登录服务暂时不可用，请稍后重试或回到首页。</p>
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
