import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

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
