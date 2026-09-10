import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { createFileRoute } from "@tanstack/react-router";

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
  const { user } = Route.useRouteContext();
  const update = useUpdateNotificationPrefsMutation();

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
            checked={user.notifyOnNewMessage}
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
