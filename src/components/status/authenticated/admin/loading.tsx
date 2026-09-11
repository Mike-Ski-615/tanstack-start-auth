import { Skeleton } from "#components/ui/skeleton";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

/**
 * 管理区加载态（/authenticated/admin）。
 *
 * 挂载点：`admin.tsx` 的 pendingComponent。
 *
 * pending 渲染在**本路由自己的组件位置**（router-core 的 Match：`match.status
 * === "pending"` 时直接返回 pending 元素），也就是替换掉 `AdminLayout` 自己 ——
 * 所以 `admin.tsx` 那层 `p-4 sm:p-5 …` 的包裹**不在**，这里必须自己带上。
 *
 * > 以前这段注释写的是「渲染在 admin.tsx 自己的 `<Outlet />` 位置，上一层
 * > padding 仍在」，于是代码也没带那层包裹。两处都错、恰好抵消，所以没人发现
 * > —— 但那是运气，不是设计。
 *
 * 注：`admin.tsx` 的 beforeLoad 是同步的，所以这个骨架实际上进不了 pending 态
 * （可达性怎么判断见 `__tests__/loading-alignment.test.ts`）。修它是因为它是错的，
 * 不是因为有人会看到。
 *
 * 管理区是「标题 + 描述 + 表格」的通用形状，骨架照这个摆。
 */
export function LoadingPage() {
  return (
    <div className={`p-4 sm:p-5 ${SIDEBAR_GUTTER_CLASS} ${CONTENT_WIDTH_CLASS}`}>
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
    </div>
  );
}
