// src/router.tsx
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

/**
 * QueryClient：全局错误兜底在这里。
 *
 * react-query 的约定是两层：
 *   1. 这里配 defaultOptions —— 任何查询/变更失败至少有一个人告诉用户；
 *   2. 个别 mutation 在调用点上覆盖 onError，给出更贴切的说法。
 *
 * 现在这一层写的是 `error.message` 直接展示。这个用法依赖服务端抛的是
 * **用户可读句子**而不是机器码 —— 见 lib/error-messages.ts。
 *
 * 关于覆盖：调用点自己的 onError 会**替代**这里的默认值
 * （react-query 不做叠加），所以已经写了 onError 的地方行为不变；
 * 没写的那些就落到这里，不再“静默失败”。
 *
 * ### 查询与变更的写法不一样（v5 的语言差异）
 *
 * mutation 的 onError 能写在 defaultOptions.mutations 里；
 * **query 的不行** —— Query v5 已把它从 defaultOptions.queries 移除，
 * 只保留在 QueryCache 上（见 query-core 的 QueryCacheConfig：
 * `onError?: (error, query) => void`，而 QueryObserverOptions 里没有）。
 * 所以下面分开写：变更走 defaultOptions，查询走 queryCache。
 */
export function getRouter() {
  const queryClient = new QueryClient({
    // 查询失败：唯一入口是 QueryCache（v5 的约束）
    queryCache: new QueryCache({
      onError: (error) => {
        if (typeof window === "undefined") return;
        toast.error(error.message);
      },
    }),
    defaultOptions: {
      mutations: {
        onError: (error) => {
          if (typeof window === "undefined") return;
          toast.error(error.message);
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultErrorComponent: () => <div>Internal Server Error</div>,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
