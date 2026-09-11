import { Link } from "@tanstack/react-router";

/**
 * 用户主页未找到（/authenticated/users/$userId）。
 *
 * 这页的 loader 在用户不存在时**主动** `throw notFound()`，所以这个组件
 * 是常态路径而非兜底 —— 文案要写清"这个人不存在"，不是"地址错了"。
 *
 * 挂载在 SidebarInset 内，padding 与 UserView 对齐（p-4 sm:p-6 lg:p-8）。
 * 退路给工作台：找人失败时的下一步通常是回到自己熟悉的地方，
 * 而不是留在别人的 URL 上。
 */
export function NotFoundPage() {
  return (
    <main className="min-h-full min-w-0">
      <div className="flex flex-col items-start gap-3 p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">找不到这个用户</h1>
        <p className="text-sm text-muted-foreground">
          该用户不存在，或者资料已被删除。请确认链接是否正确。
        </p>
        <Link
          to="/authenticated"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          回到工作台
        </Link>
      </div>
    </main>
  );
}
