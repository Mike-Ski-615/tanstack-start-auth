import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#components/ui/sidebar";

import { LOGOS } from "#data/logo";

export function SidebarBrand() {
  const [selected, setSelected] = React.useState(LOGOS[0]);

  if (!selected) return null;

  return (
    <SidebarMenu className="w-auto">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="default"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-6 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <selected.icon className="size-4" />
              </div>

              <span className="truncate font-bold text-base">
                {selected.title}
              </span>

              <ChevronDown className="size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            {LOGOS.map((logo) => {
              return (
                <DropdownMenuItem
                  key={logo.title}
                  onSelect={() => setSelected(logo)}
                >
                  <logo.icon className="size-4" />

                  <span>{logo.title}</span>

                  {logo.title === selected.title && (
                    <Check className="ml-auto size-4" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
