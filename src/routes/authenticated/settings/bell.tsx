import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { currentUserQueryOptions } from "#lib/queries/user";
import { notificationsListQueryOptions } from "#lib/queries/notifications";

import { Switch } from "#components/ui/switch";
import { LoadingPage } from "#components/status/authenticated/settings/bell/loading";
import { ErrorPage } from "#components/status/authenticated/settings/bell/error";
import { NotFoundPage } from "#components/status/authenticated/settings/bell/not-found";
import { useUpdateNotificationPrefsMutation } from "#hooks/use-notifications";
import { NotificationHistory } from "#components/notification/notification-history";

export const Route = createFileRoute("/authenticated/settings/bell")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  beforeLoad: async ({ context }) => {
    await context.queryClient.query({ ...notificationsListQueryOptions, staleTime: "static" });
  },
  component: SettingsBellPage,
});

function SettingsBellPage() {
  const update = useUpdateNotificationPrefsMutation();

  const { data: user, isPending, error, refetch } = useQuery(currentUserQueryOptions);

  if (isPending || user === null) return <LoadingPage />;
  if (error) return <ErrorPage reset={() => void refetch()} />;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Notification01Icon} className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">通知</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">管理站内消息与各类提醒偏好。</p>
      </header>

      <div className="flex items-center justify-between gap-4">
        <span id="notify-toast-label" className="text-sm font-medium">
          新通知弹窗提醒
        </span>

        <Switch
          id="notify-toast"
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
