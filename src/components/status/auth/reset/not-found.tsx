import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">重置链接无效</h1>
      <p className="text-sm text-muted-foreground">这个重置链接不存在或已过期。请重新申请一封。</p>
      <Link
        to="/auth/forgot-password"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        重新发送链接
      </Link>
    </div>
  );
}
