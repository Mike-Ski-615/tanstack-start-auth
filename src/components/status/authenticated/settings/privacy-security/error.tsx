import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

export function ErrorPage({ reset }: Pick<ErrorComponentProps, "reset">) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">隐私与安全加载失败</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没能读取登录设备与会话信息。这不影响你的账号安全，可以重试。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/authenticated/settings/home"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          设置总览
        </Link>
      </div>
    </div>
  );
}
