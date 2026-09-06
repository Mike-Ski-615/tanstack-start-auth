import { SidebarMenuButton, SidebarMenuItem } from "#components/ui/sidebar";
import { Library } from "lucide-react";

export function Resources() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton>
        <Library />
        <span>资源</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
