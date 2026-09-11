import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 注册页错误（/auth/register）。
 *
 * 渲染在 auth 布局内。
 *
 * 注册出错往往不是网络 —— 可能是邮箱已被占用等业务错误（那种会在
 * 表单里就地提示，不会走到这里）。走到这里说明是布局/加载层面的问题，
 * 所以退路给「去登录」：已有账号的人可以直接绕开注册。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">注册页出错</h1>
      <p className="text-sm text-muted-foreground">注册页面加载失败。你可以重试，或先前往登录。</p>
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
