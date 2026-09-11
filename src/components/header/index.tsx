import { CommandPalette } from "#components/header/command-palette";
import { HeaderBreadcrumb } from "#components/header/header-breadcrumb";
import { ModeToggle } from "#components/header/mode-toggle";
import { ContentWidthToggle } from "#components/header/content-width-toggle";
import { PanelLeftOpen } from "#components/header/panel-left-open";
import { Separator } from "#components/ui/separator";
import { useSidebar } from "#components/ui/sidebar";
import { cn } from "#lib/utils";
import { HeaderBell } from "#components/header/header-bell";
import type { Role } from "#lib/auth/current-user";

export function Header({ role }: { role: Role }) {
  const { open } = useSidebar();

  return (
    <header className={cn("flex h-12 shrink-0 items-center gap-2 border-b p-2", open && "ps-4")}>
      <PanelLeftOpen />
      <Separator
        className={cn(open && "md:hidden", "my-auto data-[orientation=vertical]:h-4")}
        orientation="vertical"
      />
      <HeaderBreadcrumb />
      {/* flex-1 + max-w-72 已经把右侧图标推到边，不再需要 ms-auto */}
      <CommandPalette role={role} />
      <Separator className="my-auto data-[orientation=vertical]:h-4" orientation="vertical" />
      <HeaderBell />
      <Separator className="my-auto data-[orientation=vertical]:h-4" orientation="vertical" />
      <ContentWidthToggle />
      <ModeToggle />
    </header>
  );
}
