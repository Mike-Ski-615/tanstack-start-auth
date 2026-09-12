import { HugeiconsIcon } from "@hugeicons/react";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "@hugeicons/core-free-icons";
import { Button } from "#components/ui/button";
import { useSidebar } from "#components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip";
import { cn } from "#lib/utils";

export function PanelLeftOpen() {
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar();
  const expanded = isMobile ? openMobile : open;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
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
