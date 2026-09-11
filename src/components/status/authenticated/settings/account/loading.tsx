import { Skeleton } from "#components/ui/skeleton";

/**
 * 账号设置加载态（/authenticated/settings/account）。
 *
 * 弹窗内（p-5 已有，不重复 padding；不用 min-h-svh）。
 *
 * 骨架照这页真实结构（已对齐源码）：
 *   header（图标 + 标题 + 说明）
 *   → 带 `border-b p-4` 的区块头
 *   → `divide-y` 里的信息行，每行是 `grid-cols-[100px_1fr]`
 *     （左边标签宽 100px，右边值）—— 这个两列网格是这页的特征，骨架必须还原，
 *     否则加载完标签/值会重新对齐。
 */
export function LoadingPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 shrink-0" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="mt-1 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </header>

      <div className="rounded-xl border">
        {/* 区块头 */}
        <div className="flex items-center gap-2 border-b p-4">
          <Skeleton className="size-4.5 shrink-0" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* 信息行：100px 标签 + 值 */}
        <div className="divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[100px_1fr] gap-1 p-4">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-40 max-w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
