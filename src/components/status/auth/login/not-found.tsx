import { Link } from "@tanstack/react-router";

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
