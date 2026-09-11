import { Skeleton } from "#components/ui/skeleton";
import { Card, CardContent, CardHeader } from "#components/ui/card";

/**
 * 发送通知加载态（/authenticated/admin/notifications）。
 *
 * 挂载在 admin 布局的 `<Outlet />` 内（外层已有 padding，不重复）。
 *
 * 这页是**表单 + 列表并排**，不是单列表单。骨架照它真实的骨架摆：
 *
 *   `@container grid gap-6 @3xl:grid-cols-2`
 *   ├─ Card「新建通知」：收件人（全体勾选 + 角色多选 + 指定人多选）
 *   │                    → 标题 → 正文 → 发送按钮
 *   └─ Card「已发送」：几条已发记录
 *
 * 两处以前是错的（这个骨架**可达**，所以是会被看到的）：
 *
 * - 摆成了单列（表单卡在上、已发送列表在下），而页面是两列栅格 ——
 *   加载完会整页换形，正是这段注释自己警告过的「形状说谎」。
 * - 卡片是手写的 `rounded-xl border p-6`，而页面用的是 `<Card>`（ring 而非
 *   border、间距来自 `--card-spacing`）。现在直接用真组件，卡片外壳不会再漂。
 */
export function LoadingPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      <div className="@container grid gap-6 @3xl:grid-cols-2">
        {/* Card「新建通知」 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-5">
              {/* 发送目标：全体勾选 + 两个多选 */}
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-14" />
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded-sm" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>

              {/* 标题 */}
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-8 w-full" />
              </div>

              {/* 正文 */}
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-24 w-full" />
              </div>

              {/* 发送按钮：靠右 */}
              <div className="flex justify-end">
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card「已发送」 */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="ml-auto h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
