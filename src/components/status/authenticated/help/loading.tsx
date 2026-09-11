import { Skeleton } from "#components/ui/skeleton";

/**
 * 帮助文档加载态（/authenticated/help）。
 *
 * 挂载点在 `SidebarInset` 内（侧栏 + header 在树上），所以：
 *   - 不用 min-h-svh（会撑出多余滚动条）；
 *   - 让开侧栏手柄（lg:ps-7）。
 *
 * 这页是**两栏文档布局**：左侧目录（6 个分组）+ 右侧正文。
 * 骨架必须体现这个结构 —— 目录 6 条对应该页真实的 sectionLabels
 * （快速开始 / 账号与身份 / 工作台与导航 / 界面操作 / 安全与故障排查 / 致开发者），
 * 右侧按"标题 + 若干段落"摆。
 */
export function LoadingPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-6 p-4 lg:flex-row lg:ps-7">
      {/* 左侧目录：6 个分组 */}
      <nav className="flex shrink-0 flex-col gap-1 lg:w-56">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </nav>

      {/* 右侧正文 */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Skeleton className="h-7 w-40" />

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        <Skeleton className="h-5 w-32" />

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-10/12" />
        </div>

        {/* 代码块 / 提示块 */}
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}
