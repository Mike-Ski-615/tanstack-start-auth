import { type ReactTable, type RowData } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowLeftDoubleIcon,
  ArrowRightDoubleIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "#components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select";

import { type UsersTableFeatures } from "./data-table-features";

interface DataTablePaginationProps<TData extends RowData> {
  table: ReactTable<UsersTableFeatures, TData>;
}

export function DataTablePagination<TData extends RowData>({
  table,
}: DataTablePaginationProps<TData>) {
  // 表驱动：四个按钮结构完全相同，只有图标/动作/可用性不同
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();
  const pageButtons = [
    {
      label: "第一页",
      icon: ArrowLeftDoubleIcon,
      onClick: () => table.setPageIndex(0),
      disabled: !canPrev,
      wide: true,
    },
    {
      label: "上一页",
      icon: ArrowLeft01Icon,
      onClick: () => table.previousPage(),
      disabled: !canPrev,
      wide: false,
    },
    {
      label: "下一页",
      icon: ArrowRight01Icon,
      onClick: () => table.nextPage(),
      disabled: !canNext,
      wide: false,
    },
    {
      label: "最后一页",
      icon: ArrowRightDoubleIcon,
      onClick: () => table.setPageIndex(table.getPageCount() - 1),
      disabled: !canNext,
      wide: true,
    },
  ];

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} / 共{" "}
        {table.getFilteredRowModel().rows.length} 行已选
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">每页行数</p>
          <Select
            value={`${table.state.pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-17.5">
              <SelectValue placeholder={table.state.pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 25, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-25 items-center justify-center text-sm font-medium">
          第 {table.state.pagination.pageIndex + 1} / {table.getPageCount()} 页
        </div>
        <div className="flex items-center space-x-2">
          {pageButtons.map(({ label, icon, onClick, disabled, wide }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  // 首/末页按钮在窄屏隐藏（省空间，中间两个够用）
                  className={wide ? "hidden size-8 lg:flex" : "size-8"}
                  onClick={onClick}
                  disabled={disabled}
                >
                  <span className="sr-only">{label}</span>
                  <HugeiconsIcon icon={icon} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}
