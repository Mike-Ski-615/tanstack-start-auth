import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpDownIcon, ColorPickerIcon, Home01Icon, Key02Icon, Logout01Icon, MoonIcon, Notification01Icon, Settings01Icon, Shield01Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "#components/ui/avatar";
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
import { useLogoutMutation } from "#hooks/use-auth-mutations";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "#server/user.functions";
import { useTheme } from "#provider/theme-provider";

export function UserNav({ user }: { user: User }) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const logoutMutation = useLogoutMutation();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg">
                <Avatar>
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                  <AvatarBadge
                    title={user.status === "online" ? "在线" : "离线"}
                    className={
                      user.status === "online"
                        ? "bg-emerald-500"
                        : "bg-destructive"
                    }
                  />
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
                    <AvatarFallback className="rounded-lg">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                    <AvatarBadge
                      title={user.status === "online" ? "在线" : "离线"}
                      className={
                        user.status === "online"
                          ? "bg-emerald-500"
                          : "bg-destructive"
                      }
                    />
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <HugeiconsIcon icon={ColorPickerIcon} />
                    主题
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>主题切换</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={theme}
                          onValueChange={(value) =>
                            setTheme(value === "dark" ? "dark" : "light")
                          }
                        >
                          <DropdownMenuRadioItem value="light">
                            <HugeiconsIcon icon={Sun01Icon} />
                            亮色主题
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="dark">
                            <HugeiconsIcon icon={MoonIcon} />
                            暗色主题
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <HugeiconsIcon icon={Settings01Icon} />
                    设置
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>设置</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={() =>
                            navigate({
                              to: "/authenticated/settings/home",
                            })
                          }
                        >
                          <HugeiconsIcon icon={Home01Icon} />
                          设置主页
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            navigate({ to: "/authenticated/settings/bell" })
                          }
                        >
                          <HugeiconsIcon icon={Notification01Icon} />
                          通知
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            navigate({ to: "/authenticated/settings/password" })
                          }
                        >
                          <HugeiconsIcon icon={Key02Icon} />
                          修改密码
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            navigate({ to: "/authenticated/settings/profile" })
                          }
                        >
                          <HugeiconsIcon icon={Key02Icon} />
                          修改个人信息
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() =>
                            navigate({
                              to: "/authenticated/settings/privacy-security",
                            })
                          }
                        >
                          <HugeiconsIcon icon={Shield01Icon} />
                          隐私和安全
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => logoutMutation.mutate()}
              >
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
