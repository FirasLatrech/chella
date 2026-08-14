import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { Shell } from "@/components/dashboard/shell";
import { FeedSection } from "@/components/dashboard/feed-section";
import { RightRail } from "@/components/dashboard/right-rail";
import { PageHeader } from "@/components/dashboard/page-header";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/keys";
import { fetchFeed, requireAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

// The server prefetches the feed (cookie-forwarded, so myVote is included)
// and hydrates the React Query cache; the client takes over from there.
export default async function Home() {
  await requireAuth("/");
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.feed,
    queryFn: fetchFeed,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Shell>
        <PageHeader title="Feed" />
        <FeedSection rail={<RightRail />} />
      </Shell>
    </HydrationBoundary>
  );
}
