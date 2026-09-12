import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

export function getRouter() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (!import.meta.env.SSR) {
          toast.error(error.message);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (!import.meta.env.SSR) {
          toast.error(error.message);
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultErrorComponent: () => <div>Internal Server Error</div>,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    scrollRestoration: true,
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
