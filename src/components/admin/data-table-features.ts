import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * 管理员表格启用的 feature。
 *
 * 严格按 shadcn 的 Data Table 指南（TanStack Table v9）来：
 * v9 改成显式注册制 —— 没注册的能力会被 tree-shake 掉，**内置的
 * 过滤函数与排序函数也一样要注册**（filterFns / sortFns），否则用了
 * 名字也找不到实现。
 *
 * 未注册 rowSelectionFeature：管理员表格不做批量操作。
 * 未注册 columnSizingFeature：列宽交给内容自适应，不写死。
 */
export const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

/**
 * 传给 ColumnDef / Column / Table / Row 的第一个泛型，
 * 让各处类型知道有哪些 feature API 可用。
 */
export type DataTableFeatures = typeof features;
