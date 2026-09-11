import { Link } from "@tanstack/react-router";

/**
 * 忘记密码页未找到（/auth/forgot-password）。
 *
 * 渲染在 auth 布局内。
 *
 * 这里给「去登录」而非首页：用户点进这页是想恢复访问，
 * 登录页是离目标最近的可用出口。
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">页面不可用</h1>
      <p className="text-sm text-muted-foreground">没找到重置密码页面。可以直接前往登录。</p>
      <Link
        to="/auth/login"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        去登录
      </Link>
    </div>
  );
}
