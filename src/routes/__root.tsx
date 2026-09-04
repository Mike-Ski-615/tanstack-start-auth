// src/routes/__root.tsx
import type { ReactNode } from "react";
import {
  Outlet,
  HeadContent,
  Scripts,
  Link,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import appCss from "../styles/app.css?url";
import { QueryClient } from "@tanstack/react-query";
import { Toaster } from "#components/ui/sonner";
import { ThemeProvider } from "#provider/theme-provider";

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
  notFoundComponent: NotFound,
});

/** 全局 404：给回首页的退路，而非死胡同。 */
function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6">
      <h1 className="text-2xl font-semibold text-foreground">页面未找到</h1>
      <p className="text-muted-foreground">你访问的地址不存在或已被移动。</p>
      <Link
        to="/"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回到首页
      </Link>
    </main>
  );
}

function RootComponent() {
  return (
    <RootDocument>
      {/* 当前用户单源在 _authenticated 守卫（useRouteContext），不在此处重复拉取。 */}
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="theme">
          <Toaster />
          {children}
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  );
}
