import { Link } from "@tanstack/react-router";

/**
 * 学生管理未找到（/authenticated/admin/students）。
 *
 * 挂载在 admin 布局的 `<Outlet />` 内，外层已有 padding，不重复。
 *
 * 这页是固定路径、不带参数，所以"未找到"基本只有拼错地址一种原因 ——
 * 文案直说这点，退路给教师管理（管理区入口）。
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">学生管理页不存在</h1>
      <p className="text-sm text-muted-foreground">
        没找到学生管理页面，地址可能有误。学生列表在教师管理旁边。
      </p>
      <Link
        to="/authenticated/admin/teachers"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回教师管理
      </Link>
    </div>
  );
}
