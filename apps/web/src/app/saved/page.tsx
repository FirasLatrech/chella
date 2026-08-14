import { Shell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { SavedList } from "@/components/saved/saved-list";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/keys";
import { fetchSaved, requireAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  await requireAuth("/saved");

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.saved,
    queryFn: fetchSaved,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Shell>
        <PageHeader title="Saved" />

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
            <div className="w-full px-5 pb-16">
              <main className="mt-1 min-w-0">
                <SavedList />
              </main>
            </div>
          </div>
        </div>
      </Shell>
    </HydrationBoundary>
  );
}
