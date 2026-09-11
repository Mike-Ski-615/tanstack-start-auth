import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 通知设置错误（/authenticated/settings/bell）。
 *
 * 弹窗内（外层 p-5 已有，不重复 padding），容器对齐 max-w-3xl。
 *
 * 这一页是「新通知是否弹 toast」的开关，读的是查询缓存里的偏好 ——
 * 读不到时会退回默认值（true，即照弹），所以这里失败的影响是温和的，
 * 文案不必危言耸听。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">通知设置加载失败</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没能读取通知偏好。可以重试，或返回设置总览换一个分区。
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
