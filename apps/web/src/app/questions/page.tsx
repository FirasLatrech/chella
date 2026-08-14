import Link from "next/link";
import { PenNewSquareIcon } from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Shell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { QuestionsList } from "@/components/questions/questions-list";
import { QuestionsRail } from "@/components/questions/questions-rail";
import {
  controlBase,
  controlGaps,
  controlSizes,
} from "@/components/ui/control";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/keys";
import { fetchFeed, requireAuth } from "@/lib/api";


export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  await requireAuth("/questions");
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({ queryKey: queryKeys.feed, queryFn: fetchFeed });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
    <Shell>
      <PageHeader title="Questions" />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
          <div className="flex w-full gap-6 px-5 pb-10">
            <main className="min-w-0 flex-1 pt-1">
              <QuestionsList />
            </main>
            <div className="hidden w-72 shrink-0 xl:block" />
          </div>
        </div>

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
