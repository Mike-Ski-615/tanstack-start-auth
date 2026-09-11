import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "#components/ui/button";
import { ROLE_HOME, type Role } from "#lib/auth/current-user";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

/**
 * 教师工作台错误（/authenticated/teacher）。
 *
 * 挂载点在 SidebarInset 内，不用 min-h-svh（避免顶出滚动条），
 * 边距与 loading 及真实页一致（p-4 + 手柄留白）。
 *
 * 退路走 ROLE_HOME：教师会落到教师工作台，学生若误入也会被送回自己的。
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
    // 容器类名用页面那组常数：本状态页会**替换**本路由自己的组件，那层包裹得自己带
    <section
      className={`flex flex-col items-start gap-3 p-4 ${SIDEBAR_GUTTER_CLASS} ${CONTENT_WIDTH_CLASS}`}
    >
      <h1 className="text-2xl font-bold text-foreground">出错了</h1>
      <p className="text-sm text-muted-foreground">
        教师工作台没能加载出来，可以重试或回到工作台首页。
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
