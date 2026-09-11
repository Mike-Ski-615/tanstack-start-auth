import { Skeleton } from "#components/ui/skeleton";

/**
 * 密码设置加载态（/authenticated/settings/password）。
 *
 * 弹窗内（外层 p-5 已有，不重复 padding；不用 min-h-svh）。
 *
 * 骨架照这页真实结构（已对齐源码）：
 *   header（图标 + 标题 + 说明）
 *   → `<form>` 内的 `FieldGroup`
 *   → 两个 Field（当前密码 / 新密码），每个是 FieldLabel + Input
 *   → 底部提交按钮
 * 这是表单页，所以摆字段而不是卡片 —— 否则加载完整页换形。
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

      <form className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          {/* 当前密码 */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-full" />
          </div>

          {/* 新密码 */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-8 w-24" />
        </div>
      </form>
    </div>
  );
}
