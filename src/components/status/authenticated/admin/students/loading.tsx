import { Skeleton } from "#components/ui/skeleton";

/**
 * 学生管理加载态（/authenticated/admin/students）。
 *
 * 这一页有 loader（`beforeLoad` 里 `ensureQueryData` 预取学生列表），
 * 所以这个骨架是**真会被看到**的 —— 它不是理论上的兜底。
 *
 * 挂载点：admin 布局的 `<Outlet />` 内，外层已是 p-4 sm:p-5 + 手柄留白，
 * 这里不重复 padding。
 *
 * 骨架严格照 `DataTable` 的真实结构（这是定制的价值）：
 *   DataTableToolbar（搜索框 + 角色/状态筛选 + 视图切换）
 *   → overflow-hidden rounded-md border → TableHeader → TableBody 行
 * 行数与分页默认的每页条数无关，取 5 行足以表达"这是表格"。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>

      <div className="flex flex-col gap-4">
        {/* DataTableToolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>

        {/* 表格本体 */}
        <div className="overflow-hidden rounded-md border">
          <div className="flex items-center gap-4 border-b bg-muted/50 p-3">
            <Skeleton className="size-4 rounded-sm" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>

          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b p-3 last:border-b-0">
              <Skeleton className="size-4 rounded-sm" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
