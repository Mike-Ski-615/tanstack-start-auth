import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "#components/ui/button";
import { ROLE_HOME } from "#lib/auth/current-user";

/**
 * 已登录区错误（/authenticated）。
 *
 * ### 与 __root 那版的区别
 *
 * 挂载点在 `SidebarInset` 内 —— 侧栏和 header 仍在，所以：
 *   1. 不用 `min-h-svh`（会顶出滚动条），用 `flex-1` 填剩余高度；
 *   2. 让开侧栏手柄（`lg:ps-7`），与真实页面一致。
 *
 * 退路按**角色**给：`ROLE_HOME[user.role]` 是这个人自己的落地页。
 * 原来的实现一律指 `/`，在校验过的区域里点下去会被重定向回来 —— 死胡同。
 *
 * 角色从 router state 的 /authenticated 匹配项上读，**不能** import
 * `#routes/authenticated` —— 那个路由文件本身 import 了本文件
 * （挂 pendingComponent/errorComponent），反向 import 会形成循环依赖。
 *
 * 用 router state 而非 useRouteContext，是因为后者的返回类型在
 * 「可能未挂载」时退化为 undefined，无法给出可用的 to 值。
 *
 * context 可能尚未就绪，所以做了兜底：拿不到就退回首页，而不是崩掉。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  const role = useRouterState({
    select: (s) => s.matches.find((m) => m.routeId === "/authenticated")?.context?.user?.role,
  });

  const fallback: string = role ? ROLE_HOME[role] : "/";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background p-4 text-center sm:p-6 lg:ps-7">
      <h1 className="text-2xl font-semibold text-foreground">出错了</h1>
      <p className="max-w-md text-muted-foreground">
        这个页面没能加载出来，可能是网络波动。可以重试，或先回到你的工作台。
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
    </div>
  );
}
