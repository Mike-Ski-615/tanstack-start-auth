import { SidebarMenuButton, SidebarMenuItem } from "#components/ui/sidebar";
import { Users } from "lucide-react";

export function Collaboration() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton>
        <Users />
        <span>小组合作</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
