import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "#components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select";
import type { RowData, ReactTable } from "@tanstack/react-table";
import type { DataTableFeatures } from "./data-table-features";

/**
 * 分页控件。
 *
 * 照 shadcn Data Table 指南的 DataTablePagination 实现：
 * 左侧显示选中数与总行数，右侧是「每页 N 条」与四个翻页按钮。
 *
 * 管理员表格未注册 rowSelectionFeature（不做批量操作），所以这里只显示
 * 总行数，没有官方的「已选 N / 共 M 行」。要加批量操作时再补。
 */
interface DataTablePaginationProps<TData extends RowData> {
  // ReactTable（useTable 的返回类型）才带 state；基础 Table 是 Omit 掉 store 的
  table: ReactTable<DataTableFeatures, TData>;
}

export function DataTablePagination<TData extends RowData>({
  table,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.state.pagination;

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        共 {table.getFilteredRowModel().rows.length} 行
      </div>

      <div className="flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">每页</p>
          <Select value={`${pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          第 {pageIndex + 1} / {table.getPageCount()} 页
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="第一页"
          >
            <HugeiconsIcon icon={ChevronsLeftIcon} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="上一页"
          >
            <HugeiconsIcon icon={ChevronLeftIcon} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="下一页"
          >
            <HugeiconsIcon icon={ChevronRightIcon} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="最后一页"
          >
            <HugeiconsIcon icon={ChevronsRightIcon} />
          </Button>
        </div>
      </div>
    </div>
  );
}
