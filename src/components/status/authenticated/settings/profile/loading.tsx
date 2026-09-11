import { Skeleton } from "#components/ui/skeleton";

/**
 * 个人资料加载态（/authenticated/settings/profile）。
 *
 * 弹窗内（外层 p-5 已有，不重复 padding；不用 min-h-svh）。
 *
 * 骨架照这页真实结构（已对齐源码）：表单字段比密码页多一个 ——
 * 用户名 / 简介 / 头像。头像那一块是它的特征，所以多摆一个圆形占位，
 * 而不是照密码页的两个字段。
 */
export function LoadingPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 shrink-0" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="mt-1 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </header>

      <form className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          {/* 头像 + 用户名 */}
          <div className="flex items-center gap-4">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <Skeleton className="h-8 w-32" />
          </div>

          {/* 用户名 */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-full" />
          </div>

          {/* 简介 */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-8 w-24" />
        </div>
      </form>
    </div>
  );
}
