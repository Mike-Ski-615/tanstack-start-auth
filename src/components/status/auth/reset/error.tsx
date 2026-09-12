import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

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
