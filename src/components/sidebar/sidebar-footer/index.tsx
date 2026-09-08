import { SidebarFooter } from "#components/ui/sidebar";
import { HelpDocumentation } from "#components/sidebar/sidebar-footer/help-documentation";
import { UserNav } from "#components/sidebar/sidebar-footer/user-nav";
import type { User } from "#server/user.functions";
export function AppSidebarFooter({ user }: { user: User }) {
  return (
    <SidebarFooter>
      <HelpDocumentation />
      <UserNav user={user} />
    </SidebarFooter>
  );
}
