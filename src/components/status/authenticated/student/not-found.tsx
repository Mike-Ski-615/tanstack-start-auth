import { Link, useRouterState } from "@tanstack/react-router";
import { ROLE_HOME, type Role } from "#lib/auth/current-user";

/**
 * 学生工作台未找到（/authenticated/student）。
 *
 * 挂在 SidebarInset 内，不用 min-h-svh；边距与 loading / 真实页的 `p-4` 一致。
 *
 * 退路给工作台而非首页：这页本身就是学生工作台，若它都定位不到，
 * 首页是唯一还能确定可达的地方 —— 所以角色拿不到时才退首页。
 * 拿得到角色时仍指向该角色工作台（对学生会话更有意义）。
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
    <section className="flex flex-col items-start gap-3 p-4 lg:ps-7">
      <h1 className="text-2xl font-bold text-foreground">页面不存在</h1>
      <p className="text-sm text-muted-foreground">没找到这个学生工作台地址。</p>
      <Link
        to={fallback}
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回到工作台
      </Link>
    </section>
  );
}
