import { SidebarFooter } from "#components/ui/sidebar";
import { HelpDocumentation } from "#components/sidebar/sidebar-footer/help-documentation";
import { UserInfo } from "#components/sidebar/sidebar-footer/user-info";
import { User } from "#server/user.functions";

export function AppSidebarFooter({ user }: { user: User }) {
  return (
    <SidebarFooter>
      <HelpDocumentation />
      <UserInfo user={user} />
    </SidebarFooter>
  );
}
