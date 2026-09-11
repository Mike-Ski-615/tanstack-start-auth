import { Link } from "@tanstack/react-router";

/**
 * 首页未找到（index）。
 *
 * 首页是 `/`，它自己「未找到」的情况其实只有拼错路径时由它兜底 ——
 * 但仍单独给一份：文案不写「你访问的地址」这种泛泛说法，而是直接
 * 把两条真实入口摆出来（首页本来就是干这个的）。
 */
export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6">
      <h1 className="text-2xl font-semibold text-foreground">页面不存在</h1>
      <p className="max-w-md text-center text-muted-foreground">
        没找到这个地址。直接去登录，或先注册一个账号。
      </p>
      <div className="flex items-center gap-3">
        <Link
          to="/auth/login"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          登录
        </Link>
        <span className="text-muted-foreground" aria-hidden="true">
          ·
        </span>
        <Link
          to="/auth/register"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          注册
        </Link>
      </div>
    </main>
  );
}
