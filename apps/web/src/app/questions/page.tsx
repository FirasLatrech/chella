import Link from "next/link";
import { PenNewSquareIcon } from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Shell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { QuestionsPanel } from "@/components/questions/questions-panel";
import { QuestionsRail } from "@/components/questions/questions-rail";
import {
  controlBase,
  controlGaps,
  controlSizes,
} from "@/components/ui/control";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/keys";
import { fetchFeed, fetchPostPage, requireAuth } from "@/lib/api";


export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  await requireAuth("/questions");
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: queryKeys.feed, queryFn: fetchFeed }),
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.infinite({ kind: "question" }),
      queryFn: () => fetchPostPage({ kind: "question" }),
      initialPageParam: "",
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
    <Shell>
      <PageHeader title="Questions" />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <QuestionsPanel />

        {/* Rail pinned to the panel, matching the feed page. */}
        <div className="scroll-slim absolute top-3 right-5 bottom-0 z-40 hidden w-72 overflow-y-auto pb-6 xl:block">
          {/* Asking happens in the feed composer with Question preselected. */}
          <Link
            href="/"
            className={cn(
              controlBase,
              "mb-4 w-full cursor-pointer justify-center font-[450] select-none",
              "bg-primary text-primary-foreground hover:bg-primary/80",
              "rounded-xl transition-all duration-150 active:scale-95",
              controlGaps.md,
              controlSizes.md,
            )}
          >
            <PenNewSquareIcon size={16} />
            Ask a question
          </Link>
          <QuestionsRail />
        </div>
      </div>
    </Shell>
    </HydrationBoundary>
  );
}
