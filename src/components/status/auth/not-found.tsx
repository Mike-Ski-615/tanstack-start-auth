import { Link } from "@tanstack/react-router";

/**
 * auth 区未找到（/auth）。
 *
 * 渲染在 auth 布局的 max-w-sm 容器内，所以不重复 min-h-svh。
 *
 * 退路给首页：`/auth/xxx` 这种路径打错时，能去的稳定落点是首页 ——
 * 而不是再丢一个 auth 链接（那正是刚失败的地方）。
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">页面不存在</h1>
      <p className="text-sm text-muted-foreground">这个登录相关页面不存在，可能链接已失效。</p>
      <Link to="/" className="text-sm font-medium underline underline-offset-4 hover:no-underline">
        回到首页
      </Link>
    </div>
  );
}
