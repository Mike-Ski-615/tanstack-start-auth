import { Skeleton } from "#components/ui/skeleton";

/**
 * 教师管理加载态（/authenticated/admin/teachers）。
 *
 * 与学生管理那份**内容几乎相同，但独立成文件**：两者都是「标题 + 表格」，
 * 可它们的列不同（教师多一列学生数），将来也各自演化。分开写，
 * 骨架才能跟着各自的表格走 —— 这是"完全定制"的实际含义。
 *
 * 挂载点：admin 布局的 `<Outlet />` 内，外层已有 p-4 sm:p-5 + 手柄留白，
 * 这里不重复 padding。
 *
 * 学生管理：3 个工具条控件；教师管理：同样 3 个（搜索 + 验证状态 + 视图）。
 * 列宽按教师表的真实列摆（姓名 / 邮箱 / 状态 / 操作）。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>

      <div className="flex flex-col gap-4">
        {/* DataTableToolbar：搜索 + 筛选 + 视图 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>

        {/* 表格：列与教师表一致 */}
        <div className="overflow-hidden rounded-md border">
          <div className="flex items-center gap-4 border-b bg-muted/50 p-3">
            <Skeleton className="size-4 rounded-sm" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>

          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b p-3 last:border-b-0">
              <Skeleton className="size-4 rounded-sm" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
