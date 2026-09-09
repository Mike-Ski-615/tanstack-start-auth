import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import {
  Link,
  Outlet,
  useNavigate,
  createFileRoute,
  useRouter,
} from "@tanstack/react-router";
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
