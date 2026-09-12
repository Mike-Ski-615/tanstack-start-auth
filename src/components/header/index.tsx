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
    <header className={cn("flex h-12 shrink-0 items-center gap-2 border-b p-2", open && "lg:ps-4")}>
      <PanelLeftOpen />
      <Separator
        className={cn(open && "lg:hidden", "my-auto data-[orientation=vertical]:h-4")}
        orientation="vertical"
      />

      <HeaderBreadcrumb />

      <CommandPalette className="ml-auto" role={role} />

      <Separator className="my-auto data-[orientation=vertical]:h-4" orientation="vertical" />

      <HeaderBell />

      <Separator
        className="my-auto hidden data-[orientation=vertical]:h-4 sm:block"
        orientation="vertical"
      />
      <ContentWidthToggle className="hidden sm:inline-flex" />

      <Separator className="my-auto data-[orientation=vertical]:h-4" orientation="vertical" />
      <ModeToggle />
    </header>
  );
}
