import { SidebarMenuButton, SidebarMenuItem } from "#components/ui/sidebar";
import { BookMarked } from "lucide-react";

export function Lessons() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton>
        <BookMarked />
        <span>课例</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
