import { cn } from "#lib/utils";
import { Button } from "#components/ui/button";
import { useSidebar } from "#components/ui/sidebar";

export function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      onClick={toggleSidebar}
      className={cn(
        className,
        "h-96 w-2.5 p-0 bg-sidebar",
        "hover:bg-sidebar-accent",
      )}
      {...props}
    >
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
