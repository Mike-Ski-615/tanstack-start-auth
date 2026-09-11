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
 * 学生管理加载态（/authenticated/admin/students）。
 *
 * 这一页有 loader（`beforeLoad` 里 `queryClient.query` 预取学生列表），
 * 所以这个骨架是**真会被看到**的 —— 它不是理论上的兜底。
 *
 * 挂载点：admin 布局的 `<Outlet />` 内，外层已是 p-4 sm:p-5 + 手柄留白，
 * 这里不重复 padding。
 *
 * ## 表格区用真原语，不手写盒子
 *
 * 外框是 `DataTableFrame`（真表格用的同一个），行是 `Table` / `TableHeader` /
 * `TableRow` / `TableCell` —— 行高、边框、单元格内距全部来自同一个地方，
 * 表格改了骨架跟着改。以前这里是手写的
 * `overflow-hidden rounded-md border` + `flex items-center gap-4 border-b p-3`，
 * 而真表格的 `TableCell` 是 `p-2`、`TableHead` 是 `h-10 px-2`：行高从一开始就
 * 不一致（骨架偏高）。
 *
 * 占位块的**宽度**是近似值：真表格是 auto 布局、列宽由内容决定，骨架不试图
 * 对齐每一列（那得用 JS 量宽度，不值得）。它保证的是：同样的行数、同样的行高、
 * 同样的外框。
 *
 * 工具栏那一行仍是手写近似 —— `DataTableToolbar` 要一个 TanStack table 实例
 * （读写 columnFilters），骨架拿不到；也不该为它造一个空实例，那会渲染出
 * 真能输入、却没有数据的搜索框。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>

      <div className="flex flex-col gap-4">
        {/* DataTableToolbar 的近似（理由见上）：搜索 + 两个筛选 + 视图切换 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
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
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-40" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
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
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
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
