import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { SETTINGS_NAV } from "#data/nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "#components/ui/breadcrumb";
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

export const Route = createFileRoute("/authenticated/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = SETTINGS_NAV.find((item) => item.to === pathname);

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
      <DialogContent className="overflow-hidden p-0 sm:max-w-175 lg:max-w-200 h-[min(80vh,500px)] max-h-[calc(100vh-2rem)]">
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
                            <item.icon />
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
          <main className="flex min-w-0 min-h-0 flex-1 flex-col">
            {/* Header */}
            <header className="flex h-14 shrink-0 items-center border-b">
              <div className="flex items-center px-5">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink asChild>
                        <Link to="/authenticated/settings">设置</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>

                    <BreadcrumbSeparator className="hidden md:block" />

                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {current?.title ?? "设置"}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>

            {/* Outlet Area */}
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide p-5">
              <Outlet />
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
