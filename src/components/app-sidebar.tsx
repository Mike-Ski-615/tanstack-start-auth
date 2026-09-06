import { Sidebar } from "#components/ui/sidebar";
import { AppSidebarHeader } from "#components/sidebar/sidebar-header";
import { AppSidebarContent } from "#components/sidebar/sidebar-content";
import { AppSidebarFooter } from "#components/sidebar/sidebar-footer";
import { User } from "#server/user.functions";

export function AppSidebar({ user }: { user: User }) {
  return (
    <Sidebar>
      <AppSidebarHeader />

      <AppSidebarContent />

      <AppSidebarFooter user={user} />
    </Sidebar>
  );
}
