import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#components/ui/sidebar";
import { BookText, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function HelpDocumentation() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link to="/authenticated/help">
            <BookText />
            <span className="flex-1">帮助文档</span>
            <ExternalLink />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
