import { Skeleton } from "#components/ui/skeleton";

/**
 * 管理区加载态（/authenticated/admin）。
 *
 * 挂载点：`admin.tsx` 的 pendingComponent。它渲染在 `admin.tsx` 自己的
 * `<Outlet />` 位置 —— 也就是说**上一层的 p-4 sm:p-5 + 手柄留白仍在**。
 *
 * 所以这里的外层**不再重复那套 padding**：再加一遍会让骨架比真实内容
 * 多缩进一层。只填内容即可。
 *
 * 管理区是「标题 + 描述 + 表格」的通用形状，骨架照这个摆。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-64 max-w-full" />
      </div>

      <div className="flex flex-col gap-4">
        {/* 工具条：搜索 + 两个筛选 + 视图切换 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>

        {/* 表格：表头 + 若干行 */}
        <div className="overflow-hidden rounded-md border">
          <div className="border-b p-3">
            <Skeleton className="h-4 w-full" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b p-3 last:border-b-0">
              <Skeleton className="size-4 rounded-sm" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
