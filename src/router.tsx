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
 *
 * ### defaultOptions.queries 的取值
 *
 * 以前这里完全没配 queries，于是全靠库默认值。而库的默认里有一条很隐形的：
 *
 *     // query-core/retryer.js
 *     const retry = config.retry ?? (isServer() ? 0 : 3);
 *
 * 即浏览器端**默认重试 3 次**且有指数退避 —— 一次失败最长要约 7 秒才报错。
 * 不翻库源码看不出来，所以在这里显式写出来。
 *
 * 各值的选择：
 *   staleTime: 30s  —— 库默认是 0，意味着每次挂载/窗口聚焦都重新请求。
 *                     30s 内切换页面直接命中缓存，数据仍算是新的。
 *                     轮询类（通知/会话）与实时性要求高的地方各自覆盖。
 *   retry: 1        —— 比库默认的 3 次更克制：失败大多不是瞬时的，
 *                     快速把错误交给页面自己的错误态比默默等 7 秒好。
 *   refetchOnWindowFocus: true —— 切回标签页时对齐一次，配合上面的
 *                     staleTime 不会频繁发请求。
 *
 * 需要差异的地方就局部覆盖（queryOptions 或 useQuery 的选项），
 * 下面几处都有各自的注释说明为何不一样。
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
      queries: {
        staleTime: 30_000,
        // gcTime: 缓存的垃圾回收时间。库默认是浏览器端 5 分钟
        // （query-core/removable.js: `newGcTime ?? (isServer() ? Infinity : 3e5)`），
        // 对通知列表这类数据偏短 —— 用户离开 5 分钟后回来又要重取。
        // skill 建议 30 分钟，这里照办。
        // 注：v5 把 v4 的 cacheTime 改名为 gcTime。
        gcTime: 30 * 60 * 1000,
        // retry: 1 而非 skill 建议的 2 —— 页面都有自己的错误态与重试按钮，
        // 快速把错误交出去比默默多等一轮更可控（库默认是 3，更长）。
        retry: 1,
        refetchOnWindowFocus: true,
      },
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
    // hover/focus 即预取目标路由的 loader/beforeLoad —— 数据提前进 Query 缓存。
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
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
