import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">注册页不可用</h1>
      <p className="text-sm text-muted-foreground">
        没找到注册页面。如果你已有账号，可以直接登录。
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
