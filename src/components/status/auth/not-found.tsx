import { Link } from "@tanstack/react-router";

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
