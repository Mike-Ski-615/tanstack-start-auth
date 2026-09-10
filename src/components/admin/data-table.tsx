import { useState, useMemo } from "react";
import { useTable, type SortingState, type ColumnDef } from "@tanstack/react-table";
import { adminTableFeatures } from "./table-features";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table";
import { Input } from "#components/ui/input";
import { Button } from "#components/ui/button";
import { cn } from "#lib/utils";
import type { User } from "#lib/auth/current-user";

/**
 * 管理员用户表格：搜索 + 排序 + 分页。
 *
 * 用 @tanstack/react-table **v9** 的插件式 API —— 与网上大多数 v8 教程
 * 不兼容。v9 的三条铁律（见库自带的 skills/getting-started）：
 *
 *   1. `useTable({ features, data, columns })`，不是 v8 的 `useReactTable`
 *   2. 可选能力（排序/分页/筛选）必须**显式注册**在 `tableFeatures({...})`
 *      里，且 row model 槽位也放进去 —— 没注册的话方法和状态根本不存在
 *   3. 渲染用 `table.FlexRender`，不是顶层导入的 `FlexRender`
 *
 * `features` 与 `columnHelper` 定义在模块作用域：每次渲染重建会让表格
 * 状态失忆（库的文档把这条列为 MEDIUM 常见错误）。
 */

type Props = {
  data: User[];
  // 列定义必须与 adminTableFeatures 配套（见 table-features.ts）
  columns: ColumnDef<typeof adminTableFeatures, User, unknown>[];
  searchPlaceholder?: string;
  emptyText?: string;
  noMatchText?: string;
};

export function DataTable({
  data,
  columns,
  searchPlaceholder = "搜索姓名或邮箱…",
  emptyText = "暂无数据",
  noMatchText = "没有匹配的记录",
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // columns 每渲染重建会让表格重新计算，交给 useMemo
  const cols = useMemo(() => columns, [columns]);

  const table = useTable({
    features: adminTableFeatures,
    columns: cols,
    data,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  });

  const rows = table.getRowModel().rows;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xs">
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
          aria-label="搜索用户"
        />
      </div>

      <div className="rounded-xl border bg-card">
        <Table style={{ tableLayout: "fixed" }}>
          {/*
           * react-table 是 headless 的：它只算列宽，不生成 DOM。要让列定义里
           * 的 size 生效，得自己把它接到 <colgroup>，并配上 table-layout: fixed
           * （否则浏览器仍按内容分配宽度，colgroup 只当成建议）。
           */}
          <colgroup>
            {table.getAllLeafColumns().map((col) => (
              <col key={col.id} style={{ width: `${col.getSize()}px` }} />
            ))}
          </colgroup>

          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          <table.FlexRender header={header} />
                          <HugeiconsIcon
                            icon={
                              sorted === "asc"
                                ? ArrowUp01Icon
                                : sorted === "desc"
                                  ? ArrowDown01Icon
                                  : ArrowUpDownIcon
                            }
                            className={cn(
                              "size-3.5",
                              sorted ? "text-foreground" : "text-muted-foreground",
                            )}
                          />
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={cols.length} className="h-24 text-center text-muted-foreground">
                  {data.length === 0 ? emptyText : noMatchText}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            第 {table.state.pagination.pageIndex + 1} / {pageCount} 页
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              上一页
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
