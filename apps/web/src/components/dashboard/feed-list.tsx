"use client";

import { TabGroup } from "@headlessui/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Tabs, TabItem } from "@/components/ui/tabs";
import { VirtualFeed } from "./virtual-feed";
import { useFeed, useInfinitePosts } from "@/lib/queries";
import type { FeedKind } from "./feed-item";

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
 * only ever see the pages already loaded. The tab counts still come from the
 * flat useFeed cache, which is the whole set rather than page one.
 */
export function FeedList({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLElement | null>;
}) {
  const [filter, setFilter] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const kind = FILTERS[filter].kind;

  const params = useMemo(() => {
    const next: Record<string, string> = {};
    if (kind !== "all") next.kind = kind;
    return next;
  }, [kind]);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfinitePosts(params);

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  // Counts come from the full feed, not the loaded pages.
  const { data: all } = useFeed();
  const counts = useMemo(() => {
    const byKind = { all: 0, question: 0, project: 0, post: 0 };
    for (const e of all ?? []) {
      byKind[e.kind] += 1;
      byKind.all += 1;
    }
    return byKind;
  }, [all]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
      <div ref={topRef} />

      {/* Sticks directly under the composer band — its offset is the
          composer's live measured height, so it tracks expansion too. */}
      <div
        style={{ top: "var(--composer-h, 0px)" }}
        className="bg-background/85 sticky z-20 -mx-3 mb-1 flex items-center justify-between px-3 py-2 backdrop-blur-md"
      >
        <Tabs>
          {FILTERS.map((f) => (
            <TabItem key={f.kind} count={counts[f.kind]}>
              {f.label}
            </TabItem>
          ))}
        </Tabs>
      </div>

      <VirtualFeed
        entries={entries}
        hasMore={!!hasNextPage}
        loading={isFetchingNextPage}
        loadMore={loadMore}
        scrollRef={scrollRef}
      />
    </TabGroup>
  );
}
