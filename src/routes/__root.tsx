// src/routes/__root.tsx
import type { ReactNode } from "react";
import {
  Outlet,
  HeadContent,
  Scripts,
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
  notFoundComponent: () => <div>未找到</div>,
});

function RootComponent() {
  return (
    <RootDocument>
      {/* 当前登录用户由 _authenticated 守卫经 route context 提供（useRouteContext），
          此处不再用 AuthProvider 重复拉取 getUserFn（单一数据源在守卫端） */}
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
