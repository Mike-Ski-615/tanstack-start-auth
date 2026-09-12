/**
 * 表格外框 —— 真表格与骨架共用。
 *
 * 单独成模块，而不是住在 data-table.tsx 里：loading 骨架是 admin 路由的
 * `pendingComponent`，属于 eager 图。它只需要这个三行的盒子，但 import
 * data-table.tsx 会把整条 `@tanstack/table-core` 链（约 34 kB gzip）拖进
 * entry chunk —— 于是登录页也要下载表格引擎。挪到这里，骨架就不再碰到表格本体。
 *
 * 之所以让骨架和真表格共用同一个组件：以前骨架手写这个盒子，盒子形状一改就
 * 只改一边，加载结束那一瞬间能看出错位。
 */
export function DataTableFrame({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-md border">{children}</div>;
}
