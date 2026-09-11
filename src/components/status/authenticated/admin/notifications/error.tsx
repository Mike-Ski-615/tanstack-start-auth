import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 发送通知错误（/authenticated/admin/notifications）。
 *
 * 挂载在 admin 布局的 `<Outlet />` 内（外层已有 padding，不重复）。
 *
 * 这页要拉「可选用户列表」才可以发送，所以失败多半是那个查询挂了 ——
 * 重试确实有意义（列表变了、网络回来了）。
 * 退路给教师管理（管理区入口），不指 `/`（会离开管理上下文）。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">通知页加载失败</h1>
      <p className="text-sm text-muted-foreground">
        没能取到可选收件人列表。可以重试，或先回到教师管理。
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
