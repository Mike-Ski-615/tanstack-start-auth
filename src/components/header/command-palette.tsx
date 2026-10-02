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
import { SETTINGS_NAV } from "#data/nav";

export function CommandPalette({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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
        aria-label="搜索设置"
        className={cn("justify-start px-2", !isCompact && "px-2.5", className)}
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={Search01Icon} />
        <span className="hidden truncate sm:inline lg:hidden">搜索...</span>
        <span className="hidden truncate lg:inline">搜索设置...</span>
        <KbdGroup aria-hidden="true" className="ml-auto hidden shrink-0 xl:flex">
          <Kbd>Ctrl</Kbd>
          <span>+</span>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title="设置" description="跳转到设置分区。">
        <Command>
          <CommandInput placeholder="搜索设置…" />
          <CommandList>
            <CommandEmpty>无匹配结果</CommandEmpty>
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
