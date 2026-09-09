import { SidebarHeader, useSidebar } from "#components/ui/sidebar";
import { SidebarBrand } from "#components/sidebar/sidebar-header/brand";
import { SearchForm } from "#components/sidebar/sidebar-header/search-form";
import { Button } from "#components/ui/button";
import { PanelLeftClose } from "lucide-react";

export function AppSidebarHeader() {
  const { toggleSidebar } = useSidebar();
  return (
    <SidebarHeader>
      <div className="flex items-center justify-between">
        <SidebarBrand />
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <PanelLeftClose />
        </Button>
      </div>
      <SearchForm />
    </SidebarHeader>
  );
}
