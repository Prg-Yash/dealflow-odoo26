import { QueryClient, defaultShouldDehydrateQuery, isServer } from "@tanstack/react-query";

/**
 * Factory function creating a properly configured TanStack Query v5 QueryClient
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays fresh for 1 minute before refetching in background
        staleTime: 60 * 1000,
        // Cache inactive data for 5 minutes before garbage collection
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error: any) => {
          // Do not retry 401 Unauthorized or 403 Forbidden
          if (error?.status === 401 || error?.status === 403) return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Singleton QueryClient accessor for Next.js App Router.
 * - On the server: Returns a fresh instance per request to prevent cross-request cache leaks.
 * - In the browser: Returns a persistent singleton instance across client navigation.
 */
export function getQueryClient(): QueryClient {
  if (isServer || typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
