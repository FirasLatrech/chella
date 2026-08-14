import { QueryClient, defaultShouldDehydrateQuery, isServer } from "@tanstack/react-query";

/*
 * Official App Router pattern: one QueryClient per request on the server
 * (never shared between users), a lazy singleton in the browser.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Hydrated data is fresh enough for a minute; avoids an immediate
        // client refetch of what the server just rendered.
        staleTime: 60 * 1000,
      },
      dehydrate: {
        // Include pending queries so streamed prefetches hydrate too.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
