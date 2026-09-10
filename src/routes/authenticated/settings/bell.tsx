import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { createFileRoute } from "@tanstack/react-router";
import { LoadingPage } from "#components/status/authenticated/settings/bell/loading";
import { ErrorPage } from "#components/status/authenticated/settings/bell/error";
import { NotFoundPage } from "#components/status/authenticated/settings/bell/not-found";
import { Skeleton } from "#components/ui/skeleton";
export const Route = createFileRoute("/authenticated/settings/bell")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: SettingsBellPage,
});

/** 通知设置：页面骨架占位，功能开发中。 */
function SettingsBellPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Notification01Icon} className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">通知</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">管理站内消息与各类提醒偏好。</p>
      </header>

      <div className="space-y-3" aria-hidden>
        {(["w-3/4", "w-1/2", "w-2/3"] as const).map((w, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className={`h-3.5 ${w}`} />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="h-6" />
          </div>
        ))}
      </div>

      <Skeleton className="mt-1 h-9 w-36" />
    </div>
  );
}
