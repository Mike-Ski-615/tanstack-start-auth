import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "#components/ui/button";
import { ROLE_HOME } from "#lib/auth/current-user";
import { currentUserQueryOptions } from "#lib/queries/user";

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
 * 角色从 currentUser 查询缓存读（父布局 beforeLoad 已 prefetch 过同一份）。
 * 缓存尚未就绪时兜底退回 `/`，而不是崩掉。
 */
export function ErrorPage({ reset }: ErrorComponentProps) {
  const { data: user } = useQuery(currentUserQueryOptions);

  const fallback: string = user ? ROLE_HOME[user.role] : "/";

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
