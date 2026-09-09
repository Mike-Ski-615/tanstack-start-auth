import { HugeiconsIcon } from "@hugeicons/react";
import { Book02Icon, LinkSquare01Icon } from "@hugeicons/core-free-icons";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#components/ui/sidebar";
import { Link } from "@tanstack/react-router";

export function HelpDocumentation() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link to="/authenticated/help">
            <HugeiconsIcon icon={Book02Icon} />
            <span className="flex-1">帮助文档</span>
            <HugeiconsIcon icon={LinkSquare01Icon} />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
