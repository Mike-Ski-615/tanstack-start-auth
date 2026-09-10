import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#components/ui/popover";
import { Button } from "#components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip";
const notifications = [
  {
    id: 1,
    title: "欢迎回来",
    description: "你的账户已经成功登录。",
    time: "刚刚",
    unread: true,
  },
  {
    id: 2,
    title: "项目更新",
    description: "「我的项目」刚刚完成了一次更新。",
    time: "10 分钟前",
    unread: true,
  },
  {
    id: 3,
    title: "系统通知",
    description: "系统将在今晚 02:00 进行例行维护。",
    time: "1 小时前",
    unread: false,
  },
  {
    id: 4,
    title: "安全提醒",
    description: "检测到你的账户在新设备上登录。",
    time: "昨天",
    unread: false,
  },
];

export function HeaderBell() {
  return (
    <Popover>
      {/* 铃铛是纯图标按钮，没有可见文字 —— 补 tooltip 与 sr-only 文案。
          Popover 打开后有自己的标题，两者不冲突（已实测：hover 即出 tooltip）。 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <HugeiconsIcon icon={Notification01Icon} />
              <span className="sr-only">通知</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>通知</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80 p-0">
        <PopoverHeader className="border-b px-4 py-3">
          <PopoverTitle>通知</PopoverTitle>
        </PopoverHeader>

        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {notification.unread && <span className="size-2 rounded-full bg-primary" />}

                  <p className="text-sm font-medium">{notification.title}</p>
                </div>

                <p className="text-xs text-muted-foreground">{notification.description}</p>

                <p className="text-xs text-muted-foreground">{notification.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-2">
          <Button variant="ghost" className="w-full" size="sm">
            查看全部通知
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
