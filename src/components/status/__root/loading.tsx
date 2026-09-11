import { Skeleton } from "#components/ui/skeleton";

/**
 * 整站加载态（__root）。
 *
 * 挂载点：`__root.tsx` 的 pendingComponent —— 渲染在 <Outlet /> 处，
 * **没有任何外壳**（无侧栏、无 header），就是一张整屏。
 *
 * 所以这里用 min-h-svh 居中是对的：它确实是整页。
 * 下方 authenticated / settings 各子树的状态页**不能**照抄这一点 ——
 * 它们渲染在已有外壳的容器里，用 min-h-svh 会把内容顶出可视区。
 *
 * 骨架形状对应当前兜底观感：标题 + 一段说明 + 一个短操作。
 */
export function LoadingPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-5 w-64 max-w-md" />
      <Skeleton className="h-5 w-16" />
    </main>
  );
}
