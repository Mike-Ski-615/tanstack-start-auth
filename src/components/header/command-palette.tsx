import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "#components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#components/ui/command";
import { cn } from "#lib/utils";
import { Kbd, KbdGroup } from "#components/ui/kbd";
import { useHotkeys } from "react-hotkeys-hook";
import { useIsBelow } from "#hooks/use-mobile";
import { HELP_SECTIONS, navItemsFor, SETTINGS_NAV } from "#data/nav";
import type { Role } from "#lib/auth/current-user";

export function CommandPalette({ className, role }: { className?: string; role: Role }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const navItems = navItemsFor(role);

  const isCompact = useIsBelow("sm");

  useHotkeys("ctrl+k", () => setOpen((open) => !open), {
    enableOnFormTags: true,
    preventDefault: true,
  });

  return (
    <>
      <Button
        type="button"
        variant={isCompact ? "ghost" : "secondary"}
        aria-label="搜索文档"
        className={cn("justify-start px-2", !isCompact && "px-2.5", className)}
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={Search01Icon} />
        <span className="hidden truncate sm:inline lg:hidden">搜索...</span>
        <span className="hidden truncate lg:inline">搜索文档...</span>
        <KbdGroup aria-hidden="true" className="ml-auto hidden shrink-0 xl:flex">
          <Kbd>Ctrl</Kbd>
          <span>+</span>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="帮助文档"
        description="搜索或浏览帮助主题。"
      >
        <Command>
          <CommandInput placeholder="搜索帮助内容…" />
          <CommandList>
            <CommandEmpty>无匹配结果</CommandEmpty>
            <CommandGroup heading="帮助主题">
              {HELP_SECTIONS.map((item) => (
                <CommandItem key={item.id}>
                  <HugeiconsIcon icon={item.icon} />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="导航">
              {navItems.map((item) => (
                <CommandItem key={item.id}>
                  <HugeiconsIcon icon={item.icon} />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="设置">
              {SETTINGS_NAV.map((item) => (
                <CommandItem
                  key={item.to}
                  onSelect={() => {
                    navigate({ to: item.to });
                    setOpen(false);
                  }}
                >
                  <HugeiconsIcon icon={item.icon} />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
