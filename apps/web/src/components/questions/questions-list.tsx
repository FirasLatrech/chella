"use client";

import { TabGroup } from "@headlessui/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Tabs, TabItem } from "@/components/ui/tabs";
import { QuestionRow, type QuestionEntry } from "./question-row";
import { VirtualList } from "@/components/dashboard/virtual-list";
import { useInfinitePosts } from "@/lib/queries";
import { questionsFromFeed } from "@/lib/derive";

const FILTERS = [
  { label: "Newest", match: () => true },
  {
    label: "Unanswered",
    match: (q: QuestionEntry) => q.answers === 0,
  },
  { label: "Solved", match: (q: QuestionEntry) => Boolean(q.solved) },
] as const;

const PARAMS = { kind: "question" };

export function QuestionsList({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLElement | null>;
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfinitePosts(PARAMS);
  const entries = useMemo(
    () => questionsFromFeed(data?.pages.flatMap((p) => p.items) ?? []),
    [data],
  );
  const [filter, setFilter] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const counts = useMemo(
    () => FILTERS.map((f) => entries.filter(f.match).length),
    [entries],
  );

  const visible = useMemo(
    () => entries.filter(FILTERS[filter].match),
    [entries, filter],
  );

  function onChange(next: number) {
    setFilter(next);
    topRef.current
      ?.closest(".scroll-slim")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <TabGroup selectedIndex={filter} onChange={onChange}>
      <div ref={topRef} />

      <div className="bg-background/85 sticky top-0 z-20 -mx-3 mb-1 flex items-center justify-between px-3 py-2 backdrop-blur-md">
        <Tabs>
          {FILTERS.map((f, i) => (
            <TabItem key={f.label} count={counts[i]}>
              {f.label}
            </TabItem>
          ))}
        </Tabs>
      </div>

      <VirtualList
        items={visible}
        renderItem={(entry) => <QuestionRow entry={entry} />}
        scrollRef={scrollRef}
        hasMore={!!hasNextPage}
        loading={isFetchingNextPage}
        loadMore={loadMore}
        emptyState={
          <p className="text-muted-foreground px-3 py-14 text-center text-sm">
            No questions here yet.
          </p>
        }
      />
    </TabGroup>
  );
}
