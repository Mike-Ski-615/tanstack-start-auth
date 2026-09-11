import { Skeleton } from "#components/ui/skeleton";

/**
 * 注册页加载态（/auth/register）。
 *
 * 渲染在 auth 布局内，只填内容。
 *
 * 注册比登录多一个字段（姓名），骨架照实：姓名 → 邮箱 → 密码 → 按钮。
 * 这一条差异是它跟登录页骨架分开写的理由 —— 字段数不同，
 * 若复用会让「加载完成时表单跳一下」。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-52 max-w-full" />
      </div>

      <div className="flex flex-col gap-4">
        {/* 姓名 */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-8 w-full" />
        </div>

        {/* 邮箱 */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-8 w-full" />
        </div>

        {/* 密码（注册页这里常带强度提示，多留一行） */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      </div>

      <Skeleton className="h-8 w-full" />

      {/* 服务条款那行 */}
      <Skeleton className="mx-auto h-3.5 w-11/12" />

      {/* 底部「已有账号？登录」 */}
      <Skeleton className="mx-auto h-4 w-40" />
    </div>
  );
}
