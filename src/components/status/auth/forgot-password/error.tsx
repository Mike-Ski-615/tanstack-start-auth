import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 忘记密码页错误（/auth/forgot-password）。
 *
 * 渲染在 auth 布局内。
 *
 * 退路给登录页：这页的唯一目的是找回访问权限，而登录是同一件事的
 * 另一条路（如果用户其实还记得密码）。回首页则离目标更远。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">页面出错</h1>
      <p className="text-sm text-muted-foreground">
        重置密码页面加载失败，请重试。如果你还记得密码，可以直接登录。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/auth/login"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          去登录
        </Link>
      </div>
    </div>
  );
}
