import { Link } from "@tanstack/react-router";

/**
 * 注册页未找到（/auth/register）。
 *
 * 渲染在 auth 布局内。
 *
 * 退路给登录页：注册入口打不开时，登录仍是可用的另一条路 ——
 * 这比回首页少一步（首页还得再点一次）。
 */
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
