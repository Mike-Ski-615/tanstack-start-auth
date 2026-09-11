import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 密码设置错误（/authenticated/settings/password）。
 *
 * 弹窗内（外层 p-5 已有，不重复 padding），容器对齐 max-w-3xl。
 *
 * 退路给设置总览：改密码失败时，用户往往想换个分区（比如改用「忘记密码」
 * 或去看账号信息），把他留在设置上下文比踢出去更有用。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">密码设置加载失败</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没能打开密码设置。可以重试，或返回设置总览换一个分区。
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
