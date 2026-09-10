import {
  tableFeatures,
  rowSortingFeature,
  rowPaginationFeature,
  globalFilteringFeature,
  columnFilteringFeature,
  columnSizingFeature,
  createSortedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
} from "@tanstack/react-table";

/**
 * 管理员表格注册的 feature。
 *
 * 抽成模块级常量有两个原因：
 *
 * 1. **列定义与表格必须用同一份 features** —— react-table v9 把 feature
 *    类型编进了 ColumnDef，两份不同的 features 会导致列类型对不上表格。
 * 2. **不能每次渲染重建** —— 库文档把这条列为常见错误，会让表格状态失忆。
 *
 * 全局搜索（globalFilteringFeature）依赖列筛选（columnFilteringFeature），
 * v9 要求显式注册前置 feature，否则类型直接报错。
 */
export const adminTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  // 列宽（列定义里的 size）由这个 feature 提供 —— 不注册的话 size 是死数据，
  // 表格仍然按内容自适应。
  columnSizingFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

export type AdminTableFeatures = typeof adminTableFeatures;
