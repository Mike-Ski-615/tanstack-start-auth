import { Skeleton } from "#components/ui/skeleton";

/**
 * 学生工作台加载态（/authenticated/student）。
 *
 * 挂载点在 `SidebarInset` 内（侧栏 + header 在树上），所以：
 *   - **不用 `min-h-svh`** —— 那是整屏高度，会顶出多余滚动条；
 *   - 让开侧栏手柄（lg:ps-7），与真实页面同一条左边缘；
 *   - 外边距与 `student.tsx` 的 `p-4` 对齐，切换时不位移。
 *
 * 骨架照该页真实结构：一个 h1（text-2xl）+ 三行说明文字。
 * 这页内容很简单，骨架就该简单 —— 摆成表格形状反而是在说假话。
 */
export function LoadingPage() {
  return (
    <section className="p-4 lg:ps-7">
      <Skeleton className="h-8 w-16" />
      <div className="mt-2 flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    </section>
  );
}
