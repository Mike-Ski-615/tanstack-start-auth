// src/routes/__root.tsx
import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import appCss from "../styles/app.css?url";
import { QueryClient } from "@tanstack/react-query";
import { Toaster } from "#components/ui/sonner";
import { LoadingPage } from "#components/status/__root/loading";
import { ErrorPage } from "#components/status/__root/error";
import { NotFoundPage } from "#components/status/__root/not-found";
import { ThemeProvider } from "#provider/theme-provider";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "#components/ui/tooltip";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "description",
        content: "这是一个基于 TanStack Start 构建的现代 Web 应用。",
      },
      {
        title: "TanStack Start Starter",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
});

function RootComponent() {
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="light" storageKey="theme">
          <Toaster richColors position="top-center" />
          <TooltipProvider>
            <Outlet />
          </TooltipProvider>
          <Scripts />
          <TanStackDevtools
            plugins={[
              {
                id: "router",
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel router={router} />,
              },
              {
                id: "query",
                name: "TanStack Query",
                render: <ReactQueryDevtoolsPanel client={queryClient} />,
              },
            ]}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
