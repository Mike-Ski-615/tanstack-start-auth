import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete02Icon,
  Link01Icon,
  SentIcon,
  Alert01Icon,
  Loading02Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "#components/ui/button";
import { Badge } from "#components/ui/badge";
import { ScrollArea } from "#components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components/ui/alert-dialog";
import { useSentNotifications, useDeleteNotificationBatchMutation } from "#hooks/use-notifications";

export function SentNotificationsList() {
  const { data: items = [], isPending, error } = useSentNotifications();
  const remove = useDeleteNotificationBatchMutation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
        <HugeiconsIcon icon={Loading02Icon} className="size-5 animate-spin" />
        <p className="text-sm">加载中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-destructive">
        <HugeiconsIcon icon={Alert01Icon} className="size-5" />
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
        <HugeiconsIcon icon={SentIcon} className="size-5" />
        <p className="text-sm">还没有发送过通知</p>
      </div>
    );
  }

  const pending = items.find((n) => n.id === pendingId);

  return (
    <>
      <ScrollArea className="max-h-120 pr-3">
        <div className="flex flex-col gap-3">
          {items.map((n) => {
            const rate =
              n.recipientCount === 0 ? 0 : Math.round((n.readCount / n.recipientCount) * 100);
            return (
              <div
                key={n.id}
                className="group rounded-lg border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`撤回通知：${n.title}`}
                    onClick={() => setPendingId(n.id)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                  </Button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{formatDateTime(n.createdAt)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    已送达 {n.recipientCount} 人，{n.readCount} 人已读（{rate}%）
                  </span>
                  {n.link && (
                    <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] font-normal">
                      <HugeiconsIcon icon={Link01Icon} className="size-3" />
                      <span className="max-w-32 truncate">{n.link}</span>
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <AlertDialog open={pendingId !== null} onOpenChange={(o) => !o && setPendingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撤回这条通知？</AlertDialogTitle>
            <AlertDialogDescription>
              「{pending?.title}」将从
              {pending?.recipientCount ?? 0} 位收件人的通知列表中移除，
              已读状态一并消失。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">取消</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={() => {
                if (pendingId) remove.mutate(pendingId);
                setPendingId(null);
              }}
            >
              撤回
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
