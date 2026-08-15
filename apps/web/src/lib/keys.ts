// Query keys, in their own module with no "use client" directive so both
// server pages (prefetch) and client hooks share the real values — importing
// them from a client module hands server components inert proxies instead.
export const queryKeys = {
  feed: ["feed"] as const,
  entry: (id: string) => ["entry", id] as const,
  me: ["me"] as const,
  notifications: ["notifications"] as const,
  leaderboard: (params: Record<string, string>) =>
    ["leaderboard", params] as const,
  profile: (handle: string) => ["profile", handle] as const,
  /** Infinite (paged) list. Distinct from `feed`/`search`, whose flat arrays
   *  still back the rails, tag options and the sidebar badge. */
  infinite: (params: Record<string, string>) => ["infinite", params] as const,
  saved: ["saved"] as const,
  jobs: ["jobs"] as const,
  universalSearch: (q: string) => ["search-all", q] as const,
};

/** Params for a given board state — shared by page prefetch and client hook. */
export function boardParams(period: string, tag: string) {
  return { period, tag: tag === "all" ? "" : tag };
};
