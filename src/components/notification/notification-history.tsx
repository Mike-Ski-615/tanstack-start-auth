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

/**
 * 完整通知历史。
 *
 * 与铃铛里的列表不同：这里显示**全部**（含已读），铃铛那里是最近 50 条。
 * 一条通知在两边都能标已读 / 删除 —— 数据是同一份（同一个 query key），
 * 任一处操作后另一处立刻同步。
 */
export function NotificationHistory() {
  const { data: items = [], isPending, error } = useNotifications(true);

  const markRead = useMarkReadMutation();
  const remove = useDeleteNotificationMutation();

  /*
   * 三态同形：同一张卡片（rounded-xl border bg-card p-6）、居中、图标 + 文字。
   * 靠图标区分语义，不换容器结构、不加按钮。
   *
   * 之前只有 isLoading 与「空」两支，请求失败会被误算成「空」—— 渲染成
   * 「还没有收到过通知」，用户会以为真的没消息。
   */
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

          {/* 操作区：放在内容之后 —— DOM 顺序即 Tab 顺序，先读正文再到按钮。
              左右分布由前面那个 flex-1 撑开，不靠 ml-auto。 */}
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
