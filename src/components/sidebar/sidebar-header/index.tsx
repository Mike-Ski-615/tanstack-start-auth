import { HugeiconsIcon } from "@hugeicons/react";
import { PanelLeftOpenIcon } from "@hugeicons/core-free-icons";
import { SidebarHeader, useSidebar } from "#components/ui/sidebar";
import { SidebarBrand } from "#components/sidebar/sidebar-header/brand";
import { SearchForm } from "#components/sidebar/sidebar-header/search-form";
import { Button } from "#components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip";

export function AppSidebarHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <SidebarHeader>
      <div className="flex items-center justify-between">
        <SidebarBrand />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" onClick={toggleSidebar}>
              <HugeiconsIcon icon={PanelLeftOpenIcon} />
              <span className="sr-only">收起侧边栏</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">收起侧边栏</TooltipContent>
        </Tooltip>
      </div>
      <SearchForm />
    </SidebarHeader>
  );
}
