// src/routes/__root.tsx
import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import appCss from "#styles/app.css?url";
import { QueryClient } from "@tanstack/react-query";
import { Toaster } from "#components/ui/sonner";
import { LoadingPage } from "#components/status/__root/loading";
import { ErrorPage } from "#components/status/__root/error";
import { NotFoundPage } from "#components/status/__root/not-found";
import { ThemeProvider } from "#provider/theme-provider";
import { ContentWidthProvider } from "#provider/content-width-provider";
import { lazy } from "react";
import { TooltipProvider } from "#components/ui/tooltip";

// devtools 只在开发环境加载，**必须是动态 import**：
// 它们是 Solid 写的，SSR 渲染时会抛 `Client-only API called on the server side`，
// 生产构建里无条件渲染的话所有页面 500（原因与复现见 devtools-panel.tsx 顶部）。
// `import.meta.env.DEV` 是编译期常量，生产下该分支连同这些包一起被 tree-shake。
const DevtoolsPanel = import.meta.env.DEV
  ? lazy(() =>
      import("#components/devtools/devtools-panel").then((m) => ({
        default: m.DevtoolsPanel,
      })),
    )
  : () => null;

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
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
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
          {/* 内容区宽度偏好：三个工作台布局读它，切换按钮在 header 上 */}
          <ContentWidthProvider>
            <Toaster richColors position="top-center" />
            <TooltipProvider>
              {/*
                不需要在这里包查询错误边界：框架给**每个 match** 都套了一层
                CatchBoundary（渲染 route.options.errorComponent，退回
                defaultErrorComponent），而那层比这里更近 —— 页面组件抛错先被它
                接住，这里包了也看不到任何东西。原 QueryErrorBoundary 因此删除。

                将来真要用 throwOnError / useSuspenseQuery：路由级 ErrorPage 的
                「重试」只重置路由边界，**不会**复位 react-query 的查询，
                查询还停在 error 态就会立刻再抛一次 —— 那时候让那一处的
                ErrorPage 调 `queryClient.resetQueries()`，别再往外加边界。
              */}
              <Outlet />
            </TooltipProvider>
          </ContentWidthProvider>
          <Scripts />
          <DevtoolsPanel router={router} queryClient={queryClient} />
        </ThemeProvider>
      </body>
    </html>
  );
}
