import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#components/ui/sidebar";
import { NAV_ITEMS } from "#data/nav";
import { HugeiconsIcon } from "@hugeicons/react";

export function AppSidebarContent() {
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>学习资源</SidebarGroupLabel>

        <SidebarGroupContent>
          <SidebarMenu>
            {NAV_ITEMS.slice(0, 2).map((item) => {
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild>
                    <a href={item.to}>
                      <HugeiconsIcon icon={item.icon} />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>课堂活动</SidebarGroupLabel>

        <SidebarGroupContent>
          <SidebarMenu>
            {NAV_ITEMS.slice(2).map((item) => {
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild>
                    <a href={item.to}>
                      <HugeiconsIcon icon={item.icon} />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
