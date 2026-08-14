import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { CaseMinimalisticIcon } from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Shell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { JobsBrowser } from "@/components/jobs/jobs-browser";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/keys";
import { fetchJobs, requireAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

/*
 * Jobs is built but not open yet.
 *
 * The listings behind the blur are REAL — served by /api/jobs and already
 * ranked against the reader's tag ranks — so this is a preview of the actual
 * feature, not a mock of one. Flip LIVE to true to open it; nothing else
 * needs to change.
 */
const LIVE = false;

export default async function JobsPage() {
  await requireAuth("/jobs");

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.jobs,
    queryFn: fetchJobs,
  });

  const board = (
    <div className="w-full px-5 pb-16">
      <main className="mt-1 min-w-0">
        <JobsBrowser />
      </main>
    </div>
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Shell>
        <PageHeader title="Jobs" />

        {LIVE ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
              {board}
            </div>
          </div>
        ) : (
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {/* The preview — blurred and fully inert. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden blur-[6px] select-none"
            >
              {board}
            </div>

            {/* Soft wash so the blur reads as intentional, not broken. */}
            <div className="from-background/30 via-background/60 to-background absolute inset-0 bg-gradient-to-b" />

            {/* Coming soon — frame-inside-tint, translucent so the blurred
                preview still reads through both layers. */}
            <div className="absolute inset-0 grid place-items-center px-6">
              <div
                className={cn(
                  "bg-muted/50 ring-border-surface-strong w-full max-w-md rounded-2xl p-1.5 ring-[0.5px]",
                  "supports-[backdrop-filter:blur(1px)]:backdrop-blur-xl",
                )}
              >
                <div className="bg-background/80 ring-border-surface-strong rounded-xl p-8 text-center ring-[0.5px]">
                  <div className="bg-brand/10 text-brand mx-auto grid size-14 place-items-center rounded-2xl">
                    <CaseMinimalisticIcon size={28} />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold tracking-tight">
                    Jobs are coming soon
                  </h2>
                  <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm leading-relaxed text-pretty">
                    Companies will discover you through your Chelaa reputation —
                    answers, projects and contributions, not just a CV.
                  </p>
                  <p className="text-muted-foreground/70 mt-5 text-xs">
                    Keep contributing — your profile is your application.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Shell>
    </HydrationBoundary>
  );
}
