import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Link, Outlet, useNavigate, createFileRoute, useRouter } from "@tanstack/react-router";
import { SETTINGS_NAV } from "#data/nav";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "#components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "#components/ui/sidebar";
import { LoadingPage } from "#components/status/authenticated/settings/loading";
import { ErrorPage } from "#components/status/authenticated/settings/error";
import { NotFoundPage } from "#components/status/authenticated/settings/not-found";
import { Button } from "#components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar";

export const Route = createFileRoute("/authenticated/settings")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: SettingsLayout,
});

function SettingsLayout() {
  const navigate = useNavigate();
  const router = useRouter();
  const { user } = Route.useRouteContext();

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          navigate({
            to: "/authenticated",
          });
        }
      }}
    >
      <DialogContent className="h-[min(80vh,500px)] max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-175 lg:max-w-200">
        <DialogTitle className="sr-only">Settings</DialogTitle>

        <DialogDescription className="sr-only">Customize your settings here.</DialogDescription>

        {/* 窄屏纵向堆叠（导航条 + 内容），md 以上恢复成左右两栏 */}
        <SidebarProvider
          className="h-full min-h-0 flex-col items-stretch md:flex-row"
          persist={false}
          hotkey={false}
        >
          {/* Sidebar */}
          <Sidebar collapsible="none" className="hidden h-full border-r md:flex">
            <SidebarContent>
              <SidebarGroup className="p-2">
                <SidebarGroupContent>
                  {/* User */}
                  <SidebarMenu className="mb-2">
                    <SidebarMenuItem>
                      {/* 点自己的用户卡片 → 我的主页 */}
                      <SidebarMenuButton asChild className="h-auto">
                        <Link to="/authenticated/users/$userId" params={{ userId: user.id }}>
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {/* Avatar */}
                            <Avatar>
                              <AvatarImage src={user.image} alt={user.name} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>

                            {/* User info */}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium leading-5">
                                {user.name}
                              </div>

                              <div className="truncate text-xs leading-4 text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>

                  {/* Settings navigation */}
                  <SidebarMenu>
                    {SETTINGS_NAV.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <Link
                            to={item.to}
                            activeProps={{
                              className:
                                "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                            }}
                          >
                            <HugeiconsIcon icon={item.icon} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          {/*
            窄屏导航。

            md 以下侧栏整个隐藏（上面那个 Sidebar 是 hidden md:flex），
            而 DialogContent 在 sm 就能到 max-w-175 —— 不补这一条，
            640–767px 之间弹窗里没有任何导航，各设置分区只能手改 URL。

            复用同一份 SETTINGS_NAV，不另写一套列表。
          */}
          <nav
            aria-label="设置"
            className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 md:hidden"
          >
            {SETTINGS_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{
                  className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm whitespace-nowrap"
              >
                <HugeiconsIcon icon={item.icon} />
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>

          {/* Main */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Header */}
            <header className="flex h-12 shrink-0 items-center border-b">
              <div className="flex items-center gap-1 px-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => router.history.back()}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => router.history.forward()}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} />
                </Button>
              </div>
            </header>

            {/* Outlet Area */}
            <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-hide">
              <Outlet />
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
