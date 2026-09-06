import { SidebarMenuButton, SidebarMenuItem } from "#components/ui/sidebar";
import { Compass } from "lucide-react";

export function Extension() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton>
        <Compass />
        <span>拓展</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
