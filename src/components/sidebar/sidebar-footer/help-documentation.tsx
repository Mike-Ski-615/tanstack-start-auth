import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#components/ui/sidebar";
import { BookText, ExternalLink } from "lucide-react";

export function HelpDocumentation() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton>
          <BookText />
          <span className="flex-1">帮助文档</span>
          <ExternalLink />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
