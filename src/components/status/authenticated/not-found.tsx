import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ROLE_HOME } from "#lib/auth/current-user";
import { currentUserQueryOptions } from "#lib/queries/user";
import { SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

/**
 * 已登录区未找到（/authenticated）。
 *
 * ### 与 __root 那版的区别
 *
 * 挂载点在 `SidebarInset` 内 —— 侧栏和 header 仍在树上。所以：
 *   1. **不用 `min-h-svh`**（整屏高度会顶到 header 下面并撑出滚动条），
 *      改用 `flex-1` 填满内容区剩余高度；
 *   2. 让开侧栏拖拽手柄（`lg:ps-7`），与真实页面保持同一条左侧边缘。
 *
 * ### 退路为什么不是 `/`
 *
 * 这是这类页面最初最实际的 bug：`/authenticated` 有 `beforeLoad` 校验，
 * 未登录会被打回登录页；而 404 指向 `/` 时用户点下去像是"回了家"，
 * 实际又被重定向回工作台 —— 绕一圈什么都没解决。
 *
 * 所以按角色给本人工作台（ROLE_HOME）。角色从 currentUser 查询缓存读
 * （父布局 beforeLoad 已 prefetch 过同一份），缓存未就绪时兜底退回 `/`。
 */
export function NotFoundPage() {
  const { data: user } = useQuery(currentUserQueryOptions);

  const fallback: string = user ? ROLE_HOME[user.role] : "/";

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center gap-4 bg-background p-4 text-center sm:p-6 ${SIDEBAR_GUTTER_CLASS}`}
    >
      <h1 className="text-2xl font-semibold text-foreground">页面不存在</h1>
      <p className="max-w-md text-muted-foreground">这个地址不在你的账号里，或者已经被移动了。</p>
      <Link
        to={fallback}
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回到工作台
      </Link>
    </div>
  );
}
