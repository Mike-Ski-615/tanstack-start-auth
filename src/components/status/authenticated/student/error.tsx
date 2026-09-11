import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "#components/ui/button";
import { ROLE_HOME, type Role } from "#lib/auth/current-user";

/**
 * 学生工作台错误（/authenticated/student）。
 *
 * 挂载点在 SidebarInset 内，所以不用 min-h-svh（避免多余滚动条），
 * 并沿用该页自己的 `p-4` 与手柄留白 —— 与 loading 保持同一套边距。
 *
 * 退路指向 ROLE_HOME（学生即本页），而不是写死字符串：新增角色时不用改。
 * 角色从 router state 读，避免 import 路由文件造成循环依赖。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  const role = useRouterState({
    select: (s) =>
      (
        s.matches.find((m) => m.routeId === "/authenticated")?.context as
          { user?: { role?: Role } } | undefined
      )?.user?.role,
  });

  const fallback: string = role ? ROLE_HOME[role] : "/";

  return (
    <section className="flex flex-col items-start gap-3 p-4 lg:ps-7">
      <h1 className="text-2xl font-bold text-foreground">出错了</h1>
      <p className="text-sm text-muted-foreground">
        学生工作台没能加载出来，可以重试或回到工作台首页。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to={fallback}
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          回到工作台
        </Link>
      </div>
    </section>
  );
}
