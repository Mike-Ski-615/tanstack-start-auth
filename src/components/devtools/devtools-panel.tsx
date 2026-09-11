// src/components/devtools/devtools-panel.tsx
//
// devtools 面板。**只在 `import.meta.env.DEV` 下被渲染**（见 src/routes/__root.tsx）。
//
// 为什么必须挡住：
// devtools 本体是 Solid 写的（@tanstack/devtools），它会连带拉进
// @solid-primitives/keyboard / event-listener。Solid 的客户端 API 在服务端
// 会直接抛 `Client-only API called on the server side`（notSup）。
// 之前这里是无条件渲染的，于是**生产构建起来的服务上所有页面都 500**：
//
//     bun .output/server/index.mjs → GET / → 500
//     Error: Client-only API called on the server side.
//       at notSup (.output/server/_libs/@solid-primitives/event-listener+[...].mjs:401)
//
// dev 不受影响（dev 的模块解析路径不同，绕过了那段客户端 API）。
//
// 所以这里的 import 必须是 **动态的**，且整个文件只在 DEV 分支被引用 ——
// 生产构建时 `import.meta.env.DEV` 是编译期常量 false，该分支连同这几个包
// 一起被 tree-shake 掉，产物里不再出现 @tanstack/*-devtools。

import { lazy, Suspense } from "react";
import type { useRouter } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

const TanStackDevtools = lazy(() =>
  import("@tanstack/react-devtools").then((m) => ({
    default: m.TanStackDevtools,
  })),
);

const TanStackRouterDevtoolsPanel = lazy(() =>
  import("@tanstack/react-router-devtools").then((m) => ({
    default: m.TanStackRouterDevtoolsPanel,
  })),
);

const ReactQueryDevtoolsPanel = lazy(() =>
  import("@tanstack/react-query-devtools").then((m) => ({
    default: m.ReactQueryDevtoolsPanel,
  })),
);

export function DevtoolsPanel({
  router,
  queryClient,
}: {
  router: ReturnType<typeof useRouter>;
  queryClient: QueryClient;
}) {
  return (
    <Suspense fallback={null}>
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
    </Suspense>
  );
}
