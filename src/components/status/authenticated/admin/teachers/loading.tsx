import { Skeleton } from "#components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table";
import { DataTableFrame } from "#components/admin/data-table";

/**
 * 教师管理加载态（/authenticated/admin/teachers）。
 *
 * 与学生管理那份**内容几乎相同，但独立成文件** —— 这是「完全定制」那条约定的
 * 要求（就算两页内容一样，也是两份独立文件）。以前这里的注释写「教师多一列
 * 学生数」，那是**错的**：两个页面渲染的是同一个 `columns` 和同一个 `DataTable`
 * （见 components/admin/columns），表结构完全一致，差别只在数据源与文案。
 *
 * 挂载点：admin 布局的 `<Outlet />` 内，外层已有 p-4 sm:p-5 + 手柄留白，
 * 这里不重复 padding。
 *
 * ## 表格区用真原语，不手写盒子
 *
 * 与 `admin/students/loading.tsx` 同一套做法（那边写了详细理由）：外框用
 * `DataTableFrame`，行用 `Table` / `TableRow` / `TableCell` —— 行高、边框、
 * 内距来自同一个地方，不再是手写近似。占位块宽度仍是近似值（auto 布局量不准，
 * 不值得量）。
 *
 * 工具栏那一行也是手写近似：`DataTableToolbar` 要一个 TanStack table 实例。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>

      <div className="flex flex-col gap-4">
        {/* DataTableToolbar 的近似：搜索 + 筛选 + 视图 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>

        <DataTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="size-4 rounded-sm" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-44" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="size-4 rounded-sm" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-44" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableFrame>
      </div>
    </div>
  );
}
