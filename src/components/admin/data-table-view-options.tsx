import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon } from "@hugeicons/core-free-icons";

import { Button } from "#components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import type { ReactTable, RowData } from "@tanstack/react-table";
import type { DataTableFeatures } from "./data-table-features";

/**
 * 列显示开关。
 *
 * 照 shadcn Data Table 指南的 DataTableViewOptions 实现：
 * 列出所有可隐藏的列，勾选控制显示与否。
 *
 * 列名取自 column.columnDef.meta?.title（没有则退回 column.id）。
 * 项目的列定义没给 meta，所以这里用 id —— 英文 id（name/email/...）
 * 对用户不友好，因此由调用方通过 titleOf 映射成中文。
 */
interface DataTableViewOptionsProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
  /** 把列 id 映射成显示名。 */
  titleOf?: (id: string) => string;
}

export function DataTableViewOptions<TData extends RowData>({
  table,
  titleOf,
}: DataTableViewOptionsProps<TData>) {
  const hideable = table.getAllColumns().filter((column) => column.getCanHide());

  if (hideable.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="ml-auto">
          <HugeiconsIcon icon={Settings02Icon} />列
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>显示列</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hideable.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {titleOf ? titleOf(column.id) : column.id}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
