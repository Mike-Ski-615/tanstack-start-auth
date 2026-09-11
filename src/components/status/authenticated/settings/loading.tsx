import { Skeleton } from "#components/ui/skeleton";

/**
 * 设置区加载态（/authenticated/settings）。
 *
 * ### 这个文件为什么和别处都不一样
 *
 * 挂载点：`settings.tsx` 的 pendingComponent。整个设置区是个 **Dialog**
 * （`h-[min(80vh,500px)]`），内部 `<Outlet />` 又包在
 * `min-h-0 flex-1 overflow-y-auto p-5` 的滚动区里。
 *
 * 所以这里：
 *   - **绝不能用 `min-h-svh`** —— 500px 高的弹窗里塞一个整屏高度，
 *     会把弹窗撑出滚动条，而且是那种"内容明明不多却滚不动"的怪状；
 *   - **不要再加 padding** —— 外层 `p-5` 已经有了，重复会缩进两层；
 *   - 用 `h-full` 让它在滚动区里垂直居中。
 */
export function LoadingPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-56 max-w-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
