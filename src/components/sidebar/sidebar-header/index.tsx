import { HugeiconsIcon } from "@hugeicons/react";
import { PanelLeftCloseIcon } from "@hugeicons/core-free-icons";
import { SidebarHeader, useSidebar } from "#components/ui/sidebar";
import { SidebarBrand } from "#components/sidebar/sidebar-header/brand";
import { SearchForm } from "#components/sidebar/sidebar-header/search-form";
import { Button } from "#components/ui/button";

export function AppSidebarHeader() {
  const { toggleSidebar } = useSidebar();
  return (
    <SidebarHeader>
      <div className="flex items-center justify-between">
        <SidebarBrand />
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <HugeiconsIcon icon={PanelLeftCloseIcon} />
        </Button>
      </div>
      <SearchForm />
    </SidebarHeader>
  );
}
