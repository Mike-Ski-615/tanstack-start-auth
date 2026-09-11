import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 个人资料错误（/authenticated/settings/profile）。
 *
 * 弹窗内（外层 p-5 已有，不重复 padding），容器对齐 max-w-3xl。
 *
 * 这页读的是当前用户资料（`Route.useRouteContext`），所以失败可能是
 * context 层面的问题 —— 重试仍是首选，退路给设置总览。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">个人资料加载失败</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没能打开个人资料。可以重试，或返回设置总览换一个分区。
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
