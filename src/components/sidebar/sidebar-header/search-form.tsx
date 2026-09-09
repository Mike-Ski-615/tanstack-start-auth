import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { Label } from "#components/ui/label";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "#components/ui/sidebar";

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  return (
    <form {...props}>
      <SidebarGroup>
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            搜索
          </Label>
          <SidebarInput id="search" placeholder="搜索..." className="pl-8" />
          <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  );
}
