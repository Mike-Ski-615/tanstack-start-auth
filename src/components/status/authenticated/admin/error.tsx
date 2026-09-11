import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 管理区错误（/authenticated/admin）。
 *
 * 挂载点在 `admin.tsx` 的 `<Outlet />` 处 —— 外层已经有
 * `p-4 sm:p-5 + lg:ps-7`，所以这里**不重复 padding**。
 *
 * 退路给「教师管理」而不是首页：这是管理区的入口页（admin 根本身会
 * redirect 到 teachers），管理员的下一步动作几乎总在那里。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">管理区出错了</h1>
      <p className="text-sm text-muted-foreground">
        管理页面没能加载出来。可以重试，或先回到教师管理。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/authenticated/admin/teachers"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          回教师管理
        </Link>
      </div>
    </div>
  );
}
