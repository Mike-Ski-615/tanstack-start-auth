import { Skeleton } from "#components/ui/skeleton";
import { SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

/**
 * 已登录区加载态（/authenticated）。
 *
 * ### 这个文件为什么和 __root 的那份不同
 *
 * 挂载点：`authenticated.tsx` 的 pendingComponent，渲染位置是
 * `SidebarInset` 里的 `<Outlet />` —— 也就是说 **侧栏和 header 都还在树上**。
 *
 * 所以这里**绝不能**用 `min-h-svh`：那是整屏高度，会把内容顶到 header
 * 下面，并撑出多余的滚动条。正确做法是 `flex-1` 填满内容区剩余高度。
 *
 * 下面那段 SIDEBAR_GUTTER_CLASS 是必须的：内容区左侧有侧栏拖拽手柄
 * （absolute left-2 w-2.5, lg 以上可见），真实页面都让开了它，
 * 状态页也得让开，否则骨架会压在手柄上。
 */
export function LoadingPage() {
  return (
    <div
      className={`flex flex-1 items-center justify-center bg-background p-4 sm:p-6 ${SIDEBAR_GUTTER_CLASS}`}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
