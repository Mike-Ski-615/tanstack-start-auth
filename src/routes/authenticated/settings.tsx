import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import {
  Link,
  Outlet,
  useNavigate,
  createFileRoute,
  useRouter,
} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SETTINGS_NAV } from "#data/nav";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "#components/ui/dialog";
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
import { Input } from "#components/ui/input";

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
  const [search, setSearch] = useState("");

  const filteredNav = useMemo(() => {
    if (!search.trim()) return SETTINGS_NAV;
    const q = search.toLowerCase();
    return SETTINGS_NAV.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q),
    );
  }, [search]);

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
      <DialogContent className="h-[min(85vh,600px)] max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-225 lg:max-w-250">
        <DialogTitle className="sr-only">Settings</DialogTitle>

        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>

        <SidebarProvider className="h-full min-h-0 items-stretch">
          {/* Sidebar */}
          <Sidebar
            collapsible="none"
            className="hidden h-full border-r md:flex"
          >
            <SidebarContent>
              <SidebarGroup className="p-2">
                <SidebarGroupContent>
                  {/* User */}
                  <SidebarMenu className="mb-2">
                    <SidebarMenuItem>
                      <SidebarMenuButton className="h-auto">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {/* Avatar */}
                          <Avatar>
                            <AvatarImage src={user.image ?? undefined} alt={user.name} />
                            <AvatarFallback>
                              {user.name.charAt(0)}
                            </AvatarFallback>
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
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>

                  {/* Search */}
                  <div className="px-2 pb-2">
                    <div className="relative">
                      <HugeiconsIcon
                        icon={Search01Icon}
                        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        type="text"
                        placeholder="搜索设置"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>

                  {/* Settings navigation */}
                  <SidebarMenu>
                    {filteredNav.map((item) => (
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
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm">{item.title}</div>
                              {item.desc && (
                                <div className="truncate text-xs text-muted-foreground">
                                  {item.desc}
                                </div>
                              )}
                            </div>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          {/* Main */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Header */}
            <header className="flex h-12 shrink-0 items-center border-b">
              <div className="flex items-center gap-1 px-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.history.back()}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} />
                </Button>

                <Button
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
