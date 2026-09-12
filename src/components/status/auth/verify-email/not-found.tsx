import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">验证页不可用</h1>
      <p className="text-sm text-muted-foreground">
        缺少验证所需的信息。请先登录，我们会在需要时引导你完成验证。
      </p>
      <Link
        to="/auth/login"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        去登录
      </Link>
    </div>
  );
}
