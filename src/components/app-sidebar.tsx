import { Sidebar } from "#components/ui/sidebar";
import { AppSidebarHeader } from "#components/sidebar/sidebar-header/index";
import { AppSidebarContent } from "#components/sidebar/sidebar-content/index";
import { AppSidebarFooter } from "#components/sidebar/sidebar-footer/index";
import type { User } from "#server/user.functions";

export function AppSidebar({ user }: { user: User }) {
  return (
    <Sidebar>
      <AppSidebarHeader />

      <AppSidebarContent />

      <AppSidebarFooter user={user} />
    </Sidebar>
  );
}
