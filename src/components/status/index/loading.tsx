import { Skeleton } from "#components/ui/skeleton";

/**
 * 首页加载态（index）。
 *
 * 挂载点：`index.tsx` 的 pendingComponent。首页挂在 __root 的 <Outlet /> 下，
 * 无外壳，所以整屏居中正确。
 *
 * 骨架照着首页真实结构摆：标题 → 一段说明 → 两个并排按钮。
 * 尺寸对齐真实元素（h1 是 text-2xl、说明是 max-w-md、按钮两个 gap-3），
 * 这样加载完成时文字落进已有占位，不会整块跳动。
 */
export function LoadingPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6">
      <Skeleton className="h-8 w-72 max-w-full" />
      <div className="flex w-full max-w-md flex-col items-center gap-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      {/* 两个按钮：首页是「登录 / 注册」并排 */}
      <div className="flex gap-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </main>
  );
}
