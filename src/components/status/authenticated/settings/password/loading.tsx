import { Skeleton } from "#components/ui/skeleton";
import { FieldGroup } from "#components/ui/field";

/**
 * 密码设置加载态（/authenticated/settings/password）。
 *
 * 弹窗内（外层 p-5 已有，不重复 padding；不用 min-h-svh）。
 *
 * 骨架照这页真实结构（已对齐源码）：
 *   header（图标 + 标题 + 说明）
 *   → `FieldGroup` 内的两个 Field（当前密码 / 新密码），每个是 FieldLabel + Input
 *   → 底部提交按钮
 *
 * 两个刻意的对齐点：
 *
 * - `FieldGroup` 用**真组件**而不是抄它的类名。以前这里写死 `flex flex-col gap-5`，
 *   而 FieldGroup 实际是 `flex w-full flex-col gap-5 @container/field-group …` ——
 *   少的不只是 `w-full`，还有容器查询上下文。用真组件就永远不会差。
 * - 根元素是 `<div>` 而页面是 `<form>`。这是**有意的偏离**：盒子尺寸与类名完全
 *   一致（切换不位移），但加载态里不该出现一个没有提交行为的表单。
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

      <FieldGroup>
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
      </FieldGroup>

      <div className="flex justify-end">
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
