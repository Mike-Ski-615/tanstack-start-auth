import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 设置首页错误（/authenticated/settings/home）。
 *
 * 弹窗内、内容区已有 p-5，所以不重复 padding、不用 min-h-svh。
 * 容器宽度对齐 max-w-3xl（与真实页一致，避免边缘跳动）。
 *
 * 退路给设置首页自己？不行 —— 错误就发生在这页。给「关闭设置回工作台」。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">设置总览加载失败</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没能打开设置总览。可以重试，或关闭设置回到工作台。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/authenticated"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          回到工作台
        </Link>
      </div>
    </div>
  );
}
