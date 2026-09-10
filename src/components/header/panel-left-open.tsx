import { HugeiconsIcon } from "@hugeicons/react";
import { PanelLeftOpenIcon } from "@hugeicons/core-free-icons";
import { Button } from "#components/ui/button";
import { useSidebar } from "#components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip";
import { cn } from "#lib/utils";

export function PanelLeftOpen() {
  const { open, toggleSidebar } = useSidebar();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(open && "md:hidden")}
          onClick={toggleSidebar}
        >
          {/* 移动端由 HeaderBreadcrumb 等处提供触发；这个按钮只在侧边栏收起时出现 */}
          <HugeiconsIcon icon={PanelLeftOpenIcon} />
          <span className="sr-only">展开侧边栏</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>展开侧边栏</TooltipContent>
    </Tooltip>
  );
}
