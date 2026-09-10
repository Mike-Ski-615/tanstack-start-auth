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
import { HELP_SECTIONS, navItemsFor, SETTINGS_NAV } from "#data/nav";
import type { Role } from "#lib/auth/current-user";

export function CommandPalette({ className, role }: { className?: string; role: Role }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const navItems = navItemsFor(role);

  useHotkeys("ctrl+k", () => setOpen((open) => !open), {
    enableOnFormTags: true,
    preventDefault: true,
  });

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={cn(`justify-start sm:w-40 lg:w-56 xl:w-72 w-32`, className)}
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={Search01Icon} />
        <span className="hidden xl:inline-flex">搜索文档...</span>
        <span className="inline-flex xl:hidden">搜索...</span>
        <KbdGroup className="ml-auto hidden xl:flex">
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
