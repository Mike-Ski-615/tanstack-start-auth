import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#components/ui/sidebar";
import { NAV_BY_ROLE } from "#data/nav";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Role } from "#lib/auth/current-user";

/**
 * 侧边栏菜单，按角色渲染。
 *
 * 分组来自数据（NAV_BY_ROLE）而非组件里的 slice 下标 —— 各角色的
 * 分组数量与每组条数都不同，靠下标切会散架。
 */
export function AppSidebarContent({ role }: { role: Role }) {
  const groups = NAV_BY_ROLE[role];

  return (
    <SidebarContent>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild>
                    <a href={item.to}>
                      <HugeiconsIcon icon={item.icon} />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarContent>
  );
}
