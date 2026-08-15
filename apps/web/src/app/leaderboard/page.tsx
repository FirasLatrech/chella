import { Shell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { LeaderboardBrowser } from "@/components/dashboard/leaderboard-browser";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys, boardParams } from "@/lib/keys";
import { LeaderboardRail } from "@/components/dashboard/leaderboard-rail";
import { fetchBoard, fetchFeed, fetchLeaderboard, requireAuth } from "@/lib/api";

// Data comes from the Go API at request time.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  await requireAuth("/leaderboard");
  const entries = await fetchLeaderboard(); // rail: all-time snapshot

  // Prefetch the browser's default state + the feed (tag options).
  const queryClient = getQueryClient();
  const initial = boardParams("all", "all");
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.leaderboard(initial),
      queryFn: () => fetchBoard(initial),
    }),
    queryClient.prefetchQuery({ queryKey: queryKeys.feed, queryFn: fetchFeed }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
    <Shell>
      <PageHeader title="Leaderboard" />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
          <div className="flex w-full gap-4 px-3 md:gap-6 pb-10 md:px-5">
            <main className="min-w-0 flex-1 pt-1">
              <LeaderboardBrowser />
            </main>
            <div className="hidden w-72 shrink-0 xl:block" />
          </div>
        </div>

        {/* Rail pinned to the panel, matching the feed and questions pages. */}
        <div className="scroll-slim absolute top-3 right-5 bottom-0 z-40 hidden w-72 overflow-y-auto pb-6 xl:block">
          <LeaderboardRail entries={entries} />
        </div>
      </div>
    </Shell>
    </HydrationBoundary>
  );
}
