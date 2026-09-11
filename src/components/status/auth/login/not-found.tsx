import { Link } from "@tanstack/react-router";

/**
 * 登录页未找到（/auth/login）。
 *
 * 渲染在 auth 布局的 max-w-sm 内。
 *
 * 「登录页不存在」基本只可能是路由拼接出错 —— 给回到首页，
 * 而不是再指向某个 auth 子页（那可能同样不存在）。
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">登录页不可用</h1>
      <p className="text-sm text-muted-foreground">
        没找到登录页面，链接可能已失效。请从首页重新进入。
      </p>
      <Link to="/" className="text-sm font-medium underline underline-offset-4 hover:no-underline">
        回到首页
      </Link>
    </div>
  );
}
