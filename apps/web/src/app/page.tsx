import { redirect } from "next/navigation";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { Shell } from "@/components/dashboard/shell";
import { FeedSection } from "@/components/dashboard/feed-section";
import { RightRail } from "@/components/dashboard/right-rail";
import { PageHeader } from "@/components/dashboard/page-header";
import { Onboarding } from "@/components/dashboard/onboarding";
import { LandingPage } from "@/components/landing/landing-page";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/keys";
import { fetchFeed, fetchForYou, fetchPostPage, fetchMe } from "@/lib/api";

export const dynamic = "force-dynamic";

// Guests see the landing. A valid session sees the feed. fetchMe (not the
// proxy) is the split — a stale cookie must not bounce to /login, or it
// loops. Unverified accounts still have to confirm before the feed.
export default async function Home({ searchParams }: PageProps<"/">) {
  let me = null;
  try {
    me = await fetchMe();
  } catch {
    // Landing is public — a down API must not 500 the marketing page.
  }
  if (!me) return <LandingPage />;
  if (!me.emailVerified) redirect("/verify-email");
  // ?tag= filters the feed (the old /projects list is gone). It has to be
  // part of the prefetched params too — the key includes it, so prefetching
  // the unfiltered feed would miss the hydration and refetch on mount.
  const { tag } = await searchParams;
  const feedParams: Record<string, string> = { sort: "foryou" };
  if (typeof tag === "string" && tag) feedParams.tag = tag;
  const queryClient = getQueryClient();
  // Both shapes: the infinite list renders the rows, while the flat feed
  // still backs the rails and tag options. (Tab counts come from their own
  // endpoint now — the flat array is one capped page.)
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: queryKeys.feed, queryFn: fetchFeed }),
    // Must match the client's params exactly (FeedList requests sort=foryou
    // plus any ?tag=), or the hydrated cache misses and it refetches on mount.
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.infinite(feedParams),
      queryFn: () => fetchPostPage(feedParams),
      initialPageParam: "",
    }),
    // Interest-matched suggestions, so the strip is there on first paint
    // rather than popping in after hydration.
    queryClient.prefetchQuery({
      queryKey: queryKeys.forYou,
      queryFn: fetchForYou,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Shell>
        <PageHeader title="Feed">
          <Onboarding />
        </PageHeader>
        <FeedSection rail={<RightRail />} />
      </Shell>
    </HydrationBoundary>
  );
}
