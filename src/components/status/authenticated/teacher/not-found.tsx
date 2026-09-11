import { Link, useRouterState } from "@tanstack/react-router";
import { ROLE_HOME, type Role } from "#lib/auth/current-user";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

/**
 * 教师工作台未找到（/authenticated/teacher）。
 *
 * 挂在 SidebarInset 内，不用 min-h-svh；边距对齐 p-4 与手柄留白。
 *
 * 退路给工作台（拿不到角色时退首页），理由同 student 那份 ——
 * 指向 `/` 在这个已校验的区域内点下去会被重定向，等于死胡同。
 */
export function NotFoundPage() {
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
      <h1 className="text-2xl font-bold text-foreground">页面不存在</h1>
      <p className="text-sm text-muted-foreground">没找到这个教师工作台地址。</p>
      <Link
        to={fallback}
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回到工作台
      </Link>
    </section>
  );
}
