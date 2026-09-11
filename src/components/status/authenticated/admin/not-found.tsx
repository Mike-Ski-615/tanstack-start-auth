import { Link } from "@tanstack/react-router";

/**
 * 管理区未找到（/authenticated/admin）。
 *
 * 挂载在 admin 布局的 `<Outlet />` 处，外层已有 p-4 sm:p-5 + 手柄留白，
 * 这里不重复 padding。
 *
 * 退路给教师管理：它是管理区的默认落点（`/authenticated/admin` 自身
 * 就 redirect 到那里）。指 `/` 会让管理员离开管理上下文，多绕一步。
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">管理页不存在</h1>
      <p className="text-sm text-muted-foreground">没找到这个管理页面，可能地址拼错了。</p>
      <Link
        to="/authenticated/admin/teachers"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回教师管理
      </Link>
    </div>
  );
}
