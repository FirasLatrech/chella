import { Shell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProjectsBrowser } from "@/components/projects/projects-browser";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/keys";
import { fetchFeed, fetchPostPage, requireAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requireAuth("/projects");
  const queryClient = getQueryClient();
  const initialParams = { kind: "project", q: "", tag: "", sort: "top" };
  await Promise.all([
    // Initial browse state, so the grid SSRs with data…
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.infinite(initialParams),
      queryFn: () => fetchPostPage(initialParams),
      initialPageParam: "",
    }),
    // …and the full feed for the tag dropdown options.
    queryClient.prefetchQuery({ queryKey: queryKeys.feed, queryFn: fetchFeed }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
    <Shell>
      <PageHeader title="Projects" />

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <ProjectsBrowser />
      </div>
    </Shell>
    </HydrationBoundary>
  );
}
