import { HugeiconsIcon } from "@hugeicons/react";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "@hugeicons/core-free-icons";
import { Button } from "#components/ui/button";
import { useSidebar } from "#components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip";
import { cn } from "#lib/utils";

export function PanelLeftOpen() {
  /**
   * 侧栏有两套状态：桌面用 `open`、窄屏用 `openMobile`（Sheet 读的是它）。
   *
   * 此前这里只读 `open`，而 `open` 默认 true 且与 Sheet 无关 —— 于是
   * 768–1023 区间虽然点了能弹出 Sheet，按钮自己却已按桌面的逻辑隐藏/换了图标：
   * 图标与文案对不上，也与 Sheet 的开合脱节。按断点取对应状态即可。
   */
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar();
  const expanded = isMobile ? openMobile : open;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          // lg 以下（Sheet 接管）始终可见；lg 以上仅桌面侧栏收起时可见
          // ——展开时侧栏自己头部有收起按钮，不需要重复一个。
          className={cn("lg:hidden", !expanded && "lg:flex")}
          onClick={toggleSidebar}
        >
          <HugeiconsIcon icon={expanded ? PanelLeftOpenIcon : PanelLeftCloseIcon} />
          <span className="sr-only">{expanded ? "收起侧边栏" : "展开侧边栏"}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{expanded ? "收起侧边栏" : "展开侧边栏"}</TooltipContent>
    </Tooltip>
  );
}
