import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 邮箱验证页错误（/auth/verify-email）。
 *
 * 渲染在 auth 布局内。
 *
 * 验证码是**一次性且有时效**的，所以重试之外必须给「重新发送验证码」——
 * 单纯重试一个已失效的验证码永远不会成功。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">验证失败</h1>
      <p className="text-sm text-muted-foreground">
        没通过邮箱验证。验证码可能已过期，可以重新发送一封。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/auth/forgot-password"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          重新发送验证码
        </Link>
      </div>
    </div>
  );
}
