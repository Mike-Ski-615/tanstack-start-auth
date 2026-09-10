import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { currentUserQueryOptions } from "#lib/queries/current-user";

import { Switch } from "#components/ui/switch";
import { Label } from "#components/ui/label";
import { LoadingPage } from "#components/status/authenticated/loading";
import { ErrorPage } from "#components/status/authenticated/error";
import { NotFoundPage } from "#components/status/authenticated/not-found";
import { useUpdateNotificationPrefsMutation } from "#hooks/use-notifications";
import { NotificationHistory } from "#components/notification/notification-history";

export const Route = createFileRoute("/authenticated/settings/bell")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: SettingsBellPage,
});

/** 通知设置：弹窗开关 + 完整通知历史。 */
function SettingsBellPage() {
  const update = useUpdateNotificationPrefsMutation();

  /**
   * 从 query 读当前用户，**不是** Route.useRouteContext()。
   *
   * 路由 context 里的 user 是 beforeLoad 执行那一刻的快照，mutation 改了
   * 数据库、失效了 query 缓存，context 也不会变 —— 表现为「开关点了没反应，
   * 实际已经改了」。
   *
   * 这里与 beforeLoad 共用同一个 queryOptions，所以进页面时不会多一次请求
   * （ensureQueryData 已把数据放进同一份缓存）。
   */
  const { data: user } = useQuery(currentUserQueryOptions);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Notification01Icon} className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">通知</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">管理站内消息与各类提醒偏好。</p>
      </header>

      <section className="rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0 flex-1">
            <Label htmlFor="notify-toast" className="text-sm font-medium">
              新通知弹窗提醒
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              有新通知时在屏幕角落弹出提示。关掉后仍会出现在右上角的铃铛里， 只是不再打扰你。
            </p>
          </div>

          <Switch
            id="notify-toast"
            // 未加载完时按默认开启显示 —— 这一页必然在登录态下（布局已守卫），
            // 出现 undefined 只可能是首帧，用 true 避免闪一下关闭态。
            checked={user?.notifyOnNewMessage ?? true}
            onCheckedChange={(checked) => update.mutate(checked)}
            disabled={update.isPending}
            aria-label="新通知弹窗提醒"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">通知历史</h2>
        <NotificationHistory />
      </section>
    </div>
  );
}
