import { Skeleton } from "#components/ui/skeleton";

/**
 * auth 区加载态（/auth）。
 *
 * 挂载点：`auth.tsx` 的 pendingComponent。它渲染在 auth 布局内 ——
 * 该布局是 `min-h-svh 居中 + max-w-sm`，所以这里**外层不要再套一遍**，
 * 只填内容即可，否则 max-w-sm 会嵌两层导致二次收窄。
 *
 * 骨架对准登录表单的形状：标题 + 说明 + 两个字段 + 主按钮 + 一条次要链接。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>

      <Skeleton className="h-8 w-full" />
      <Skeleton className="mx-auto h-4 w-32" />
    </div>
  );
}
