import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 重置密码页错误（/auth/reset）。
 *
 * 渲染在 auth 布局内。
 *
 * 重置链接是**有时效**的，所以重试之外必须给「重新申请链接」的出路 ——
 * 否则用户卡在一张只会报错的页面上。回登录页是同一目的的入口。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">重置失败</h1>
      <p className="text-sm text-muted-foreground">
        没能完成密码重置。链接可能已过期，可以重新申请一封重置邮件。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/auth/forgot-password"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          重新发送链接
        </Link>
      </div>
    </div>
  );
}
