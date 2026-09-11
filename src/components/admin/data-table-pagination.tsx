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
    /*
     * 窄容器分两行，宽容器一行。
     *
     * 断点用容器查询（@container/@2xl）而非视口 lg: —— 与上面 DataTableToolbar
     * 同理：表格宽度由 ContentWidthToggle 控制（用户可选 narrow/wide/full），
     * 视口够宽不代表这个容器够宽。用 lg: 会在 narrow 档下提前并排，挤成一团。
     *
     * 行内分工：
     *   第一行  已选行数（自己占满一行，不跟控件争宽度）
     *   第二行  每页行数 + 页码 + 翻页按钮
     * 宽容器时两者回到同一行：行数靠左，控件组靠右。
     */
    <div className="@container flex flex-col gap-3 px-2 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:gap-0">
      <div className="text-sm text-muted-foreground @2xl:flex-1">
        {table.getFilteredSelectedRowModel().rows.length} / 共{" "}
        {table.getFilteredRowModel().rows.length} 行已选
      </div>

      {/* 控件组：窄容器时换行排列，宽容器时回到单行 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 @2xl:flex-nowrap @2xl:gap-x-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium whitespace-nowrap">每页行数</p>
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

        {/*
         * 页码文案不设固定宽度（原来 w-25），窄容器下交给 flex 自适应 ——
         * 固定宽度在「第 10 / 10 页」时会被截断，且小屏白占地方。
         */}
        <div className="flex items-center justify-center text-sm font-medium whitespace-nowrap">
          第 {table.state.pagination.pageIndex + 1} / {table.getPageCount()} 页
        </div>

        <div className="flex items-center gap-2">
          {pageButtons.map(({ label, icon, onClick, disabled, wide }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  // 首/末页按钮在窄容器隐藏（省空间，中间两个够用）
                  className={wide ? "hidden size-8 @2xl:flex" : "size-8"}
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
