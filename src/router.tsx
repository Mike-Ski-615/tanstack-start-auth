import { environmentManager, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { ErrorPage } from "#components/status/__root/error";
import { NotFoundPage } from "#components/status/__root/not-found";

export function getRouter() {
  const isServer = environmentManager.isServer();

  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (!isServer) toast.error(error.message);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: isServer ? undefined : 30 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
      mutations: {
        onError: (error) => {
          if (!isServer) toast.error(error.message);
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultErrorComponent: ErrorPage,
    defaultNotFoundComponent: NotFoundPage,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    defaultPendingMs: 500,
    defaultPendingMinMs: 150,
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
