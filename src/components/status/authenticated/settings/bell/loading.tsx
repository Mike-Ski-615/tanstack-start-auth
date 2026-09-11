import { Skeleton } from "#components/ui/skeleton";

/**
 * 通知设置加载态（/authenticated/settings/bell）。
 *
 * 弹窗内（外层 p-5 已有，不重复 padding；不用 min-h-svh）。
 *
 * 骨架照这页真实结构（已对齐源码）：
 *   header（图标 + 标题 + 说明）
 *   → `flex items-center justify-between gap-4` 的**开关行**
 *     （左边标题+描述，右边 Switch）
 * 它是单开关页，比隐私页简单，所以只摆一行 —— 摆两行加载完会塌一块。
 */
export function LoadingPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 shrink-0" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="mt-1 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </header>

      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1.5 h-3.5 w-64 max-w-full" />
          </div>
          <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}
