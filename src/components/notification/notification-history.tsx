import { HugeiconsIcon } from "@hugeicons/react";
import { Link01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";

import { Badge } from "#components/ui/badge";
import { cn } from "#lib/utils";
import { useNotifications } from "#hooks/use-notifications";

/**
 * 完整通知历史。
 *
 * 与铃铛里的列表不同：这里显示**全部**（含已读），铃铛那里是最近 50 条。
 * 只读 —— 已读/删除仍在铃铛里操作，这一页是「回头翻看」用的。
 */
export function NotificationHistory() {
  const { data: items = [], isLoading } = useNotifications(true);

  if (isLoading) {
    return (
      <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        加载中…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        还没有收到过通知
      </p>
    );
  }

  return (
    // 每条一张独立卡片（不是一个大卡片里切分）—— 条目之间有间距，
    // 视觉上能一眼看出「这是几条各自独立的通知」。
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
        </div>
      ))}
    </div>
  );
}
