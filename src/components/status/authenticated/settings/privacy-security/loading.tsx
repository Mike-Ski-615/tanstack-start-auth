import { Skeleton } from "#components/ui/skeleton";

/**
 * 隐私与安全加载态（/authenticated/settings/privacy-security）。
 *
 * 弹窗内（外层 p-5 已有，不重复 padding；不用 min-h-svh）。
 *
 * 骨架照这页真实结构（已对齐源码）：它是**展示型**页面而非表单 ——
 *   header → 带 `border-b` 的区块头 → `p-4` 区块，内含若干
 *   `flex items-center gap-3` 的行（左边文字块 + 右边操作按钮）。
 * 所以摆「行 + 右侧按钮」而不是输入框。
 */
export function LoadingPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 shrink-0" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="mt-1 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </header>

      <div className="rounded-xl border">
        {/* 区块头 */}
        <div className="flex items-center gap-2 border-b p-4">
          <Skeleton className="size-4.5 shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="p-4">
          <div className="flex flex-col gap-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1.5 h-3.5 w-56 max-w-full" />
                </div>
                <Skeleton className="h-8 w-20 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
