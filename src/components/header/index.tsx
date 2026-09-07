import { CommandPalette } from "#components/header/command-palette";
import { SidebarTrigger } from "#components/ui/sidebar";

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="lg:hidden flex" />
      <CommandPalette />
    </header>
  );
}
