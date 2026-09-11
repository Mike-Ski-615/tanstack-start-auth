import { Skeleton } from "#components/ui/skeleton";

/**
 * 重置密码页加载态（/auth/reset）。
 *
 * 渲染在 auth 布局内。
 *
 * 这页带 token 校验 + 两个密码字段（新密码 / 确认）。骨架照实摆两个字段，
 * 并保留底部那条「重新发送链接」——它在这页是常见出口。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>

      <div className="flex flex-col gap-4">
        {/* 新密码 */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-8 w-full" />
        </div>

        {/* 确认新密码 */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>

      <Skeleton className="h-8 w-full" />

      {/* token 失效时的备用出口 */}
      <Skeleton className="mx-auto h-4 w-44" />
    </div>
  );
}
