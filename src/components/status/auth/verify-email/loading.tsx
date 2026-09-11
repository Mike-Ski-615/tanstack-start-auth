import { Skeleton } from "#components/ui/skeleton";

/**
 * 邮箱验证页加载态（/auth/verify-email）。
 *
 * 渲染在 auth 布局内（max-w-sm 居中）。
 *
 * 这页的主体是**六格 OTP 输入**，不是普通输入框 —— 骨架必须照着摆：
 * 六个等宽方格 + 验证按钮 + 「重新发送」。
 * 若照普通表单摆两个长条，加载完会整体换形。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* 图标 + 标题 + 说明 */}
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* 六格验证码：与 InputOTPGroup 的排布一致 */}
      <div className="flex items-center justify-center gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="size-9 rounded-md" />
        ))}
      </div>

      <Skeleton className="h-8 w-full" />

      {/* 底部「没收到？重新发送」 */}
      <Skeleton className="mx-auto h-4 w-40" />
    </div>
  );
}
