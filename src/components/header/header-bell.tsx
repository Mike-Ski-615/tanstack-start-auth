import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Notification01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#components/ui/popover";
import { Button } from "#components/ui/button";
import { Badge } from "#components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip";
import { ScrollArea } from "#components/ui/scroll-area";
import { cn } from "#lib/utils";
import {
  useNotifications,
  useUnreadCount,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
} from "#hooks/use-notifications";

/**
 * 铃铛：未读徽章 + 通知面板。
 *
 * 数据分两个 query：
 *   - 未读数：30s 轮询（轻，只 count）
 *   - 列表：只在面板打开时才拉（enabled=open）
 * 这样关着面板时不会为一个看不见的列表付查询成本。
 */
export function HeaderBell() {
  const [open, setOpen] = useState(false);

  const { data: unread = 0 } = useUnreadCount();
  const { data: items = [], isLoading } = useNotifications(open);

  const markRead = useMarkReadMutation();
  const markAll = useMarkAllReadMutation();
  const remove = useDeleteNotificationMutation();

  /** 展示未读数：超过 99 显示 99+（避免撑破按钮）。 */
  const badge = unread > 99 ? "99+" : String(unread);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <HugeiconsIcon icon={Notification01Icon} />
              {unread > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-0.5 -end-0.5 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none tabular-nums"
                >
                  {badge}
                </Badge>
              )}
              <span className="sr-only">{unread > 0 ? `通知，${badge} 条未读` : "通知"}</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>通知</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80 p-0">
        <PopoverHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <PopoverTitle>通知</PopoverTitle>
          {unread > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} />
              全部已读
            </Button>
          )}
        </PopoverHeader>

        <ScrollArea className="max-h-80">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">加载中…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">暂无通知</p>
          ) : (
            <div className="divide-y">
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  item={n}
                  onRead={() => markRead.mutate(n.id)}
                  onDelete={() => remove.mutate(n.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  item,
  onRead,
  onDelete,
}: {
  item: {
    id: string;
    title: string;
    body: string;
    link: string | null;
    readAt: string | null;
    createdAt: string;
  };
  onRead: () => void;
  onDelete: () => void;
}) {
  const unread = !item.readAt;

  // 有链接时整块变成可跳转区域；点了顺便标已读。
  // 用 <Link> 而非 <a>：链接是站内路径（服务端已校验），走客户端路由不刷新页面。
  const inner = (
    <>
      <div className="flex items-start gap-2">
        {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
        <div className={cn("min-w-0 flex-1", !unread && "pl-4")}>
          <p className={cn("truncate text-sm", unread ? "font-medium" : "text-muted-foreground")}>
            {item.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatTime(item.createdAt)}</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="group relative">
      {item.link ? (
        <Link
          to={item.link}
          onClick={onRead}
          className="block px-4 py-3 pr-9 transition-colors hover:bg-muted/50"
        >
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRead}
          className="block w-full px-4 py-3 pr-9 text-left transition-colors hover:bg-muted/50"
        >
          {inner}
        </button>
      )}

      {/* 删除按钮：hover 或键盘聚焦时出现（否则每行都挂一个叉很吵） */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`删除通知：${item.title}`}
        onClick={onDelete}
        className="absolute top-2 right-1 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
      </Button>
    </div>
  );
}

/** 相对时间。列表里「10 分钟前」比时间戳好读。 */
function formatTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60_000);

  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}
