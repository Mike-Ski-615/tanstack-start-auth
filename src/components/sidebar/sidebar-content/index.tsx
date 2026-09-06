import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "#components/ui/sidebar";
import { Resources } from "#components/sidebar/sidebar-content/resources";
import { Lessons } from "#components/sidebar/sidebar-content/lessons";
import { Collaboration } from "#components/sidebar/sidebar-content/collaboration";
import { Exhibition } from "#components/sidebar/sidebar-content/exhibition";
import { Extension } from "#components/sidebar/sidebar-content/extension";

export function AppSidebarContent() {
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>学习资源</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <Resources />
            <Lessons />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>课堂活动</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <Collaboration />
            <Exhibition />
            <Extension />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
