import { Skeleton } from "#components/ui/skeleton";

/**
 * 用户主页加载态（/authenticated/users/$userId）。
 *
 * 挂载点在 `SidebarInset` 内（侧栏 + header 在树上）。这一页的加载是
 * **真实会看到的** —— 路由有 loader 去 `ensureQueryData` 取用户资料。
 *
 * 外层让开侧栏手柄（lg:ps-7），padding 与 UserView 的真身对齐
 * （p-4 sm:p-6 lg:p-8），这样加载完成时内容不位移。
 *
 * 骨架照 UserView 的真实块摆：头像行 → 统计 → 热力图。
 */
export function LoadingPage() {
  return (
    <main className="min-h-full min-w-0">
      <div className="flex min-w-0 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:gap-6 lg:p-8">
        {/* 头部：头像 + 姓名/邮箱 */}
        <header className="flex min-w-0 items-center gap-4 rounded-2xl bg-card p-5 lg:flex-col lg:gap-3 lg:bg-transparent lg:py-4">
          <Skeleton className="size-16 shrink-0 rounded-full lg:size-24" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 lg:items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>
        </header>

        {/* 统计块 */}
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2 h-7 w-20" />
            </div>
          ))}
        </div>

        {/* 热力图块 */}
        <div className="rounded-xl border p-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="mt-4 h-28 w-full" />
        </div>
      </div>
    </main>
  );
}
