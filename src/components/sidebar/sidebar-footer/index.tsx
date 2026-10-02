import { SidebarFooter } from "#components/ui/sidebar";
import { UserNav } from "#components/sidebar/sidebar-footer/user-nav";
import type { User } from "better-auth";

export function AppSidebarFooter({ user }: { user: User }) {
  return (
    <SidebarFooter>
      <UserNav user={user} />
    </SidebarFooter>
  );
}
