import * as React from "react";
import {
  useTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table";

import { features, type UsersTableFeatures } from "./data-table-features";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

/**
 * 表格外框 —— 真表格与骨架共用。
 *
 * 骨架以前是手写 `overflow-hidden rounded-md border` 这个盒子的：盒子形状改了
 * 只改一边，两边就不再重合（而加载完那一瞬间会看出来）。
 */
export function DataTableFrame({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-md border">{children}</div>;
}

/**
 * 用户表格（管理员用）。
 *
 * 结构照 shadcn 的 Tasks 示例（examples/tasks）：
 * toolbar 在表格上方，pagination 在下方，行选择默认开启，初始每页 25 行。
 */
interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<UsersTableFeatures, TData>[];
  data: TData[];
  /** 主搜索框绑定的列 id。 */
  searchColumn: string;
  searchPlaceholder?: string;
  /** 角色 faceted filter 选项（列表本身已按角色分时可不传）。 */
  roleOptions?: { label: string; value: string }[];
  /** 验证状态 faceted filter 选项。 */
  verifiedOptions?: { label: string; value: string }[];
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  searchColumn,
  searchPlaceholder,
  roleOptions,
  verifiedOptions,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useTable({
    features,
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 25,
      },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
  });

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        table={table}
        searchColumn={searchColumn}
        searchPlaceholder={searchPlaceholder}
        roleOptions={roleOptions}
        verifiedOptions={verifiedOptions}
      />
      <DataTableFrame>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  没有结果。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataTableFrame>
      <DataTablePagination table={table} />
    </div>
  );
}
