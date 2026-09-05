import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
} from "#components/ui/sidebar";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
