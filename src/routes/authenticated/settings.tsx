import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import {
  Link,
  Outlet,
  useNavigate,
  createFileRoute,
  useRouter,
  redirect,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SETTINGS_NAV } from "#data/nav";
import { currentUserQueryOptions } from "#lib/queries/user";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "#components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
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
  beforeLoad: ({ location }) => {
    if (location.pathname === "/authenticated/settings") {
      throw redirect({ to: "/authenticated/settings/home" });
    }
  },
});

function SettingsLayout() {
  const navigate = useNavigate();
  const router = useRouter();
  const { data: user } = useQuery(currentUserQueryOptions);

  if (!user) return null;

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

        <SidebarProvider
          className="h-full min-h-0 flex-col items-stretch md:flex-row"
          persist={false}
          hotkey={false}
        >
          <Sidebar collapsible="none" className="hidden h-full border-r md:flex">
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="h-auto">
                    <Link
                      className="flex min-w-0 flex-1 items-center gap-3"
                      to="/authenticated/users/$userId"
                      params={{ userId: user.id }}
                    >
                      <Avatar>
                        <AvatarImage src={user.image} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium leading-5">{user.name}</div>

                        <div className="truncate text-xs leading-4 text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {SETTINGS_NAV.filter((item) => !item.group).map((item) => (
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

                  <SidebarGroupLabel>外观</SidebarGroupLabel>

                  <SidebarMenu>
                    {SETTINGS_NAV.filter((item) => item.group === "外观").map((item) => (
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

          <nav
            aria-label="设置"
            className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 md:hidden"
          >
            {SETTINGS_NAV.map((item, i, arr) => (
              <div key={item.to} className="flex shrink-0 items-center gap-1">
                {item.group && arr[i - 1]?.group !== item.group ? (
                  <span className="px-1 text-xs text-muted-foreground">{item.group}</span>
                ) : null}
                <Link
                  to={item.to}
                  activeProps={{
                    className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm whitespace-nowrap"
                >
                  <HugeiconsIcon icon={item.icon} />
                  <span>{item.title}</span>
                </Link>
              </div>
            ))}
          </nav>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
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

            <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-hide">
              <Outlet />
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
