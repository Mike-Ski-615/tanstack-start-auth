import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpDownIcon,
  ColorPickerIcon,
  Logout01Icon,
  MoonIcon,
  Sun01Icon,
} from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "#components/ui/sidebar";
import { SETTINGS_NAV } from "#data/nav";
import { toast } from "sonner";
import { authClient } from "#lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "better-auth";
import { useTheme } from "#provider/theme-provider";

export function UserNav({ user }: { user: User }) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  function logout() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("已退出登录");
          navigate({ to: "/" });
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
      },
    });
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg">
                <Avatar>
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                    <AvatarFallback className="rounded-lg">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {SETTINGS_NAV.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onSelect={() => item.to && navigate({ to: item.to })}
                  >
                    <HugeiconsIcon icon={item.icon} />
                    {item.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <HugeiconsIcon icon={ColorPickerIcon} />
                    主题
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={theme}
                        onValueChange={(value) => setTheme(value === "dark" ? "dark" : "light")}
                      >
                        <DropdownMenuRadioItem value="light">
                          <HugeiconsIcon icon={Sun01Icon} />
                          亮色
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="dark">
                          <HugeiconsIcon icon={MoonIcon} />
                          暗色
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => logout()}>
                <HugeiconsIcon icon={Logout01Icon} />
                登出
                <DropdownMenuShortcut>Ctrl+Shift+L</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
