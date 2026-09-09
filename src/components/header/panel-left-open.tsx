import { HugeiconsIcon } from "@hugeicons/react";
import { PanelLeftOpenIcon } from "@hugeicons/core-free-icons";
import { Button } from "#components/ui/button";
import { useSidebar } from "#components/ui/sidebar";
import { cn } from "#lib/utils";

export function PanelLeftOpen() {
  const { open, toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(open && "md:hidden")}
      onClick={toggleSidebar}
    >
      <HugeiconsIcon icon={PanelLeftOpenIcon} />
    </Button>
  );
}
