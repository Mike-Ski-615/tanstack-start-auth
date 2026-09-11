import { Skeleton } from "#components/ui/skeleton";

/**
 * 登录页加载态（/auth/login）。
 *
 * 渲染在 auth 布局的 max-w-sm 居中容器内 —— 只填内容，不再加 min-h-svh。
 *
 * 骨架严格照登录页的真实字段摆：
 *   「邮箱」输入 → 「密码」输入 → 记住我（勾选 + 文字）→ 登录按钮。
 * 字段数与顺序都对上，加载完成时不会有元素位移。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>

      <div className="flex flex-col gap-4">
        {/* 邮箱 */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-8 w-full" />
        </div>

        {/* 密码 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-10" />
            {/* 右侧「忘记密码」链接 */}
            <Skeleton className="h-3.5 w-16" />
          </div>
          <Skeleton className="h-8 w-full" />
        </div>

        {/* 记住我 */}
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded-sm" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      <Skeleton className="h-8 w-full" />

      {/* 底部「还没有账号？注册」 */}
      <Skeleton className="mx-auto h-4 w-40" />
    </div>
  );
}
