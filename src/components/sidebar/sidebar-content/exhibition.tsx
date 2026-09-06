import { SidebarMenuButton, SidebarMenuItem } from "#components/ui/sidebar";
import { Award } from "lucide-react";

export function Exhibition() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton>
        <Award />
        <span>展评</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
