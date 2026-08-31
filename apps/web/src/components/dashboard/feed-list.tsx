"use client";

import { TabGroup } from "@headlessui/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MagnifierIcon } from "@solar-icons/react/bold-duotone";
import { Tabs, TabItem } from "@/components/ui/tabs";
import { SearchInput } from "@/components/ui/search-input";
import { ForYouNote } from "./for-you";
import { VirtualFeedGrid } from "./virtual-feed-grid";
import { VoteChallengeDialog } from "./vote-challenge-dialog";
import { useFeedCounts, useInfinitePosts } from "@/lib/queries";
import { isChallenged, subscribeVoteGuard } from "@/lib/vote-guard";
import type { FeedKind } from "./feed-item";

const SEARCH_DEBOUNCE_MS = 250;

const FILTERS: { label: string; kind: FeedKind | "all" }[] = [
  { label: "All", kind: "all" },
  { label: "Questions", kind: "question" },
  { label: "Projects", kind: "project" },
  { label: "Posts", kind: "post" },
];

/*
 * The feed list: server-paged, infinitely scrolling and virtualized.
 *
 * Filtering moved server-side with paging — filtering the client array would
 * only ever see the pages already loaded. The tab counts are server-side for
 * the same reason: any client-side count can only see what has been fetched.
 *
 * ?tag= narrows the feed to one tag. /projects was the tag-filtered list
 * until it was removed; trending tags and the search palette point here now,
 * so the one remaining list has to honour the filter they link with.
 *
 * Search is IN the feed, not the ⌘K palette: the palette jumps to one thing
 * (a post, a person, a tag); this filters the list you are already looking
 * at, composing with the kind tab and the tag. It's local state, debounced,
 * sent as `q` — the API already matched title/excerpt/author/tags for the
 * old pages. Not put in the URL: a keystroke shouldn't re-render the server
 * page, and the empty query keeps the prefetched key intact.
 */
export function FeedList({
  scrollRef,
  rail,
}: {
  scrollRef: React.RefObject<HTMLElement | null>;
  /** Icon-trigger popovers (top contributors, trending tags) — sits beside
   *  the filter tabs now that the feed runs full width. */
  rail?: ReactNode;
}) {
  const [filter, setFilter] = useState(0);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const tag = useSearchParams().get("tag") ?? "";
  const topRef = useRef<HTMLDivElement>(null);
  const kind = FILTERS[filter].kind;
  const challenged = useSyncExternalStore(
    subscribeVoteGuard,
    isChallenged,
    () => false,
  );

  // ONE feed, ranked: posts matching the reader's interests come first, the
  // rest follow newest-first. Nothing is filtered out — the server falls back
  // to plain chronological when no interests are set.
  // Debounce the typed value into the query param.
  useEffect(() => {
    const trimmed = search.trim();
    const timer = setTimeout(() => setQ(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const params = useMemo(() => {
    const next: Record<string, string> = { sort: "foryou" };
    if (kind !== "all") next.kind = kind;
    if (tag) next.tag = tag;
    if (q) next.q = q;
    return next;
  }, [kind, tag, q]);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPlaceholderData,
    isPending,
  } = useInfinitePosts(params);

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  // Counted in SQL over every post, not over the pages loaded so far.
  const { data: counts } = useFeedCounts();

  const loadMore = useCallback(() => {
    // Never page the held-over previous board — its cursor belongs to the
    // old params.
    if (hasNextPage && !isFetchingNextPage && !isPlaceholderData) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isPlaceholderData, fetchNextPage]);

  const searching = q.length > 0;
  const empty = !isPending && !isPlaceholderData && entries.length === 0;

  function onChange(next: number) {
    setFilter(next);
    // Bring the list back to its top when the filter changes. Scroll ONLY the
    // feed's own container — scrollIntoView walks every scrollable ancestor
    // and was dragging the whole page upward.
    topRef.current
      ?.closest(".scroll-slim")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <TabGroup selectedIndex={filter} onChange={onChange}>
      <VoteChallengeDialog open={challenged} />
      <div ref={topRef} />

      {/* Sticks directly under the composer band — its offset is the
          composer's live measured height, so it tracks expansion too.

          Opaque for the same reason as that band: cards scrolling underneath
          were showing through the tint as blurred smudges beside the chips. */}
      <div
        style={{ top: "var(--composer-h, 0px)" }}
        className="bg-background sticky z-20 -mx-3 mb-1 flex flex-wrap items-center justify-between gap-2 px-3 py-2"
      >
        <Tabs>
          {FILTERS.map((f) => (
            // Counts are per kind over the whole feed; while a search
            // narrows the list they'd disagree with what's shown, so hide
            // them rather than mislead.
            <TabItem key={f.kind} count={searching ? undefined : counts?.[f.kind]}>
              {f.label}
            </TabItem>
          ))}
        </Tabs>
        <div className="flex min-w-0 items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search the feed…"
            className="w-40 sm:w-52 md:w-64"
          />
          {rail}
        </div>
      </div>

      {tag || searching ? (
        // A filter the reader can't see is indistinguishable from a broken
        // feed, so it says what is applied and offers the way out.
        <p className="text-muted-foreground mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-0.5 text-xs">
          {searching ? (
            <span>
              Results for{" "}
              <span className="text-foreground">&ldquo;{q}&rdquo;</span>
            </span>
          ) : null}
          {tag ? (
            <span>
              {searching ? "in" : "Filtered by"}{" "}
              <span className="text-foreground">#{tag}</span>
            </span>
          ) : null}
          {searching ? (
            <button
              onClick={() => setSearch("")}
              className="hover:text-foreground cursor-pointer underline underline-offset-2"
            >
              Clear
            </button>
          ) : (
            <Link href="/" className="hover:text-foreground underline underline-offset-2">
              Clear
            </Link>
          )}
        </p>
      ) : (
        /* Not a separate section any more — just a line saying why the one
           feed is ordered the way it is. */
        <ForYouNote />
      )}

      {empty ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-16 text-center text-sm">
          <MagnifierIcon size={22} className="text-muted-foreground/60" />
          <p>
            {searching
              ? <>Nothing matches &ldquo;{q}&rdquo;{tag ? <> in #{tag}</> : null}.</>
              : "Nothing here yet."}
          </p>
          {searching ? (
            <button
              onClick={() => setSearch("")}
              className="hover:text-foreground cursor-pointer text-xs underline underline-offset-2"
            >
              Clear search
            </button>
          ) : null}
        </div>
      ) : (
        <VirtualFeedGrid
          entries={entries}
          hasMore={!!hasNextPage}
          loading={isFetchingNextPage}
          loadMore={loadMore}
          scrollRef={scrollRef}
        />
      )}
    </TabGroup>
  );
}
