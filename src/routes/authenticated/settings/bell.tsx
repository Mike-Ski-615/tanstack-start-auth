import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { currentUserQueryOptions } from "#lib/queries/current-user";

import { Switch } from "#components/ui/switch";
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

      {/*
       * 用 <span> 而非 <Label htmlFor>：后者会把文字与开关关联，点文字也
       * 会切换开关 —— 标准行为，但视觉上两者是分开的，用户会以为「开关
       * 自己动了」。这里只让开关本体可点。
       *
       * 代价：屏幕阅读器失去「这段文字描述的是这个开关」的关联。用
       * aria-labelledby 补回来，不牺牲可访问性。
       */}
      <div className="flex items-center justify-between gap-4">
        <span id="notify-toast-label" className="text-sm font-medium">
          新通知弹窗提醒
        </span>

        <Switch
          id="notify-toast"
          // 未加载完时按默认开启显示 —— 这一页必然在登录态下（布局已守卫），
          // 出现 undefined 只可能是首帧，用 true 避免闪一下关闭态。
          checked={user?.notifyOnNewMessage ?? true}
          onCheckedChange={(checked) => update.mutate(checked)}
          disabled={update.isPending}
          aria-labelledby="notify-toast-label"
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">通知历史</h2>
        <NotificationHistory />
      </section>
    </div>
  );
}
