import { HugeiconsIcon } from "@hugeicons/react";
import {
  Link01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  NotificationOff01Icon,
  Alert01Icon,
  Loading02Icon,
} from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";

import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import { cn } from "#lib/utils";
import {
  useNotifications,
  useMarkReadMutation,
  useDeleteNotificationMutation,
} from "#hooks/use-notifications";

export function NotificationHistory() {
  const { data: items = [], isPending, error } = useNotifications(true);

  const markRead = useMarkReadMutation();
  const remove = useDeleteNotificationMutation();

  if (isPending) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-6 text-muted-foreground">
        <HugeiconsIcon icon={Loading02Icon} className="size-5 animate-spin" />
        <p className="text-sm">加载中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-6 text-destructive">
        <HugeiconsIcon icon={Alert01Icon} className="size-5" />
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-6 text-muted-foreground">
        <HugeiconsIcon icon={NotificationOff01Icon} className="size-5" />
        <p className="text-sm">还没有收到过通知</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((n) => (
        <div key={n.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
          <span
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              n.readAt ? "bg-transparent" : "bg-primary",
            )}
            aria-hidden
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-sm", n.readAt ? "text-muted-foreground" : "font-medium")}>
                {n.title}
              </span>
              {!n.readAt && (
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1.5 py-0 text-[10px] font-normal"
                >
                  未读
                </Badge>
              )}
            </div>

            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>{new Date(n.createdAt).toLocaleString("zh-CN")}</span>

              {n.link && (
                <Link
                  to={n.link}
                  className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:no-underline"
                >
                  <HugeiconsIcon icon={Link01Icon} className="size-3" />
                  查看详情
                </Link>
              )}

              {n.readAt && (
                <span className="inline-flex items-center gap-1">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3" />
                  已读
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {!n.readAt && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => markRead.mutate(n.id)}
                disabled={markRead.isPending}
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
                标为已读
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              aria-label={`删除通知：${n.title}`}
              onClick={() => remove.mutate(n.id)}
              disabled={remove.isPending}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
