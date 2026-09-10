import { type ReactTable, type RowData } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";

import { DataTableViewOptions } from "./data-table-view-options";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { type UsersTableFeatures } from "./data-table-features";

interface DataTableToolbarProps<TData extends RowData> {
  table: ReactTable<UsersTableFeatures, TData>;
  /** 主搜索框对应的列 id（一般是 name 或 email）。 */
  searchColumn: string;
  searchPlaceholder?: string;
  /** 角色筛选项（列表已按角色分页时不传）。 */
  roleOptions?: { label: string; value: string }[];
  /** 验证状态筛选项。 */
  verifiedOptions?: { label: string; value: string }[];
}

export function DataTableToolbar<TData extends RowData>({
  table,
  searchColumn,
  searchPlaceholder = "筛选…",
  roleOptions,
  verifiedOptions,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.state.columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn(searchColumn)?.setFilterValue(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />

        {roleOptions && table.getColumn("role") && (
          <DataTableFacetedFilter
            column={table.getColumn("role")}
            title="角色"
            options={roleOptions}
          />
        )}

        {verifiedOptions && table.getColumn("emailVerifiedAt") && (
          <DataTableFacetedFilter
            column={table.getColumn("emailVerifiedAt")}
            title="验证状态"
            options={verifiedOptions}
          />
        )}

        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={() => table.resetColumnFilters()}>
            重置
            <HugeiconsIcon icon={Cancel01Icon} />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
