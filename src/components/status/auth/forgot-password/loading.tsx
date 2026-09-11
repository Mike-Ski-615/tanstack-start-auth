import { Skeleton } from "#components/ui/skeleton";

/**
 * 忘记密码页加载态（/auth/forgot-password）。
 *
 * 渲染在 auth 布局内。
 *
 * 这一页只有**一个**字段（邮箱）加一个提交按钮 —— 骨架就得这么简单。
 * 若照登录页的三字段摆，加载完会塌掉一大块。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-24" />
        {/* 说明较长：这页要讲清「会发一封重置邮件」 */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-8 w-full" />
      </div>

      <Skeleton className="h-8 w-full" />

      {/* 底部「想起密码了？返回登录」 */}
      <Skeleton className="mx-auto h-4 w-36" />
    </div>
  );
}
