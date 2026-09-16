import { Shell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { LeaderboardPanel } from "@/components/dashboard/leaderboard-panel";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys, boardParams } from "@/lib/keys";
import { fetchBoard, requireAuth } from "@/lib/api";

// Data comes from the Go API at request time.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  await requireAuth("/leaderboard");
  // Prefetch the one all-time board used by both the list and Top 3 rail.
  const queryClient = getQueryClient();
  const initial = boardParams("all", "all");
  await queryClient.prefetchQuery({
    queryKey: queryKeys.leaderboard(initial),
    queryFn: () => fetchBoard(initial),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
    <Shell>
      <PageHeader title="Leaderboard" />

      <LeaderboardPanel />
    </Shell>
    </HydrationBoundary>
  );
}
