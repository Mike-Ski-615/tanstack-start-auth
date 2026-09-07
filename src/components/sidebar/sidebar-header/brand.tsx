import { Radical } from "lucide-react";

export function SidebarBrand() {
  return (
    <>
      <div className="flex aspect-square size-8 items-center justify-center">
        <Radical className="size-4" />
      </div>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">Acme Inc</span>
        <span className="truncate text-xs">Enterprise</span>
      </div>
    </>
  );
}
