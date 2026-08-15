import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AltArrowLeftIcon,
  CheckCircleIcon,
  EyeIcon,
  AltArrowRightIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Shell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { VoteColumn } from "@/components/post/vote-column";
import { Discussion } from "@/components/post/discussion";
import { SaveEntryButton } from "@/components/post/save-entry-button";
import { PostActions } from "@/components/post/post-actions";
import { MediaTrigger } from "@/components/ui/media-viewer";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/keys";
import { fetchEntry, fetchFeed, relatedTo, requireAuth } from "@/lib/api";
import { BlockView } from "@/components/post/block-view";

const KIND_LABEL = { question: "Question", project: "Project", post: "Post" };
const BACK: Record<string, { href: string; label: string }> = {
  question: { href: "/questions", label: "Back to questions" },
  project: { href: "/projects", label: "Back to projects" },
  post: { href: "/", label: "Back to feed" },
};

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: PageProps<"/post/[id]">) {
  const { id } = await params;
  await requireAuth(`/post/${id}`);
  const queryClient = getQueryClient();
  const entry = await queryClient.fetchQuery({
    queryKey: queryKeys.entry(id),
    queryFn: () => fetchEntry(id),
  });
  if (!entry) notFound();

  const back = BACK[entry.kind];
  const related = relatedTo(entry, await fetchFeed());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
    <Shell>
      <PageHeader title={KIND_LABEL[entry.kind]} />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
          <div className="flex w-full gap-6 px-5 pb-16">
            <main className="min-w-0 flex-1">
              <Link
                href={back.href}
                className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-xs transition-colors"
              >
                <AltArrowLeftIcon size={13} />
                {back.label}
              </Link>

              <article className="flex gap-2.5 md:gap-4">
                <VoteColumn postId={entry.id} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="text-xl leading-snug font-semibold tracking-tight text-balance md:text-2xl">
                      {entry.title}
                      {entry.solved ? (
                        <span className="ml-2 inline-flex translate-y-[-2px] items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 align-middle text-xs font-medium text-emerald-600 dark:text-emerald-500">
                          <CheckCircleIcon size={13} />
                          Solved
                        </span>
                      ) : null}
                    </h1>
                    <div className="flex shrink-0 items-center gap-1">
                      <SaveEntryButton postId={entry.id} />
                      <PostActions postId={entry.id} />
                    </div>
                  </div>

                  <div className="text-muted-foreground mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <Link
                      href={`/people/${entry.author}`}
                      className="hover:opacity-80 flex items-center gap-2 transition-opacity"
                    >
                      <Avatar seed={entry.author} src={entry.avatar} size="xs" />
                      <span className="text-foreground font-medium">
                        @{entry.author}
                      </span>
                    </Link>
                    <span>·</span>
                    <span>
                      {entry.time}
                      {entry.edited ? " · edited" : ""}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <EyeIcon size={13} />
                      {entry.views.toLocaleString()} views
                    </span>
                  </div>

                  {entry.image ? (
                    <MediaTrigger
                      src={entry.image}
                      label="View image"
                      className="mt-5 block w-full"
                    >
                      <div
                        role="img"
                        style={{ backgroundImage: `url(${entry.image})` }}
                        className="ring-border-surface-strong aspect-[2/1] max-h-[420px] w-full rounded-2xl bg-cover bg-center ring-[0.5px]"
                      />
                    </MediaTrigger>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-4">
                    {entry.blocks.map((block, i) => (
                      <BlockView key={i} block={block} />
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <Discussion postId={entry.id} />
                </div>
              </article>
            </main>
            <div className="hidden w-72 shrink-0 xl:block" />
          </div>
        </div>

        {/* Rail — author + related, pinned to the panel. */}
        <div className="scroll-slim absolute top-4 right-5 bottom-0 z-40 hidden w-72 overflow-y-auto pb-6 xl:block">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">About the author</CardTitle>
              </CardHeader>
              <CardBody className="p-1.5">
                <Link
                  href={`/people/${entry.author}`}
                  className="hover:bg-accent/70 flex items-center gap-3 rounded-lg p-1.5 transition-colors"
                >
                  <Avatar seed={entry.author} src={entry.avatar} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium capitalize">
                      {entry.author}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      @{entry.author} · Chelaa member
                    </div>
                  </div>
                </Link>
              </CardBody>
            </Card>

            {related.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Related</CardTitle>
                </CardHeader>
                <CardBody className="p-1.5">
                  {related.map((item) => (
                    <Link
                      key={item.id}
                      href={`/post/${item.id}`}
                      className="hover:bg-accent/70 group flex items-start gap-2 rounded-lg px-2 py-2 transition-colors"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {item.title}
                      </span>
                      <AltArrowRightIcon
                        size={13}
                        className={cn(
                          "text-muted-foreground mt-0.5 shrink-0",
                          "transition-transform duration-200 group-hover:translate-x-0.5",
                        )}
                      />
                    </Link>
                  ))}
                </CardBody>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
    </HydrationBoundary>
  );
}
