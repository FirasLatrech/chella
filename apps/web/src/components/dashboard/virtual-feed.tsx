"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { FeedItem, type FeedEntry } from "./feed-item";

/*
 * Virtualized, infinitely-scrolling feed.
 *
 * Only the rows near the viewport are mounted, so the list stays cheap no
 * matter how many pages have loaded. The scroll container is an ancestor
 * (the panel's own .scroll-slim element) rather than a nested scroller —
 * nesting one would give the page two scrollbars and break the sticky tabs.
 */
export function VirtualFeed({
  entries,
  hasMore,
  loadMore,
  loading,
  /** Ref to the scrolling ancestor. */
  scrollRef,
  estimateSize = 116,
}: {
  entries: FeedEntry[];
  hasMore: boolean;
  loadMore: () => void;
  loading: boolean;
  scrollRef: React.RefObject<HTMLElement | null>;
  estimateSize?: number;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // The virtualizer needs a mounted scroll element and this list's offset
  // within it. Neither exists on the server or during the first client pass,
  // so we record them after mount and virtualize from the second render on.
  const [layout, setLayout] = useState<{ ready: boolean; margin: number }>({
    ready: false,
    margin: 0,
  });

  useEffect(() => {
    if (!scrollRef.current || !listRef.current) return;
    setLayout({ ready: true, margin: listRef.current.offsetTop });
  }, [scrollRef]);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 6,
    // Rows are measured after mount, so variable-height cards (image vs no
    // image) settle to their real size instead of the estimate.
    measureElement: (el) => el.getBoundingClientRect().height,
    scrollMargin: layout.margin,
    enabled: layout.ready,
  });

  const items = virtualizer.getVirtualItems();
  const lastIndex = items.length > 0 ? items[items.length - 1].index : 0;
  const measured = layout.ready && items.length > 0;

  // Fetch the next page once the tail comes into view.
  useEffect(() => {
    if (hasMore && !loading && lastIndex >= entries.length - 4) {
      loadMore();
    }
  }, [hasMore, loading, lastIndex, entries.length, loadMore]);

  const offsetTop = items[0]?.start ?? 0;

  // Not memoized: the virtualizer's callbacks are recreated per render by
  // design, so caching rows against them would hold stale measurements.
  const rows = items.map((item) => (
    <div
      key={entries[item.index].id}
      data-index={item.index}
      ref={virtualizer.measureElement}
    >
      <FeedItem entry={entries[item.index]} />
    </div>
  ));

  return (
    <div ref={listRef}>
      {measured ? (
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${offsetTop - virtualizer.options.scrollMargin}px)`,
            }}
          >
            {rows}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {entries.map((entry) => (
            <FeedItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground py-6 text-center text-xs">
          Loading more…
        </p>
      ) : null}
      {!hasMore && entries.length > 0 && !loading ? (
        <p className="text-muted-foreground/70 py-6 text-center text-xs">
          You&rsquo;ve reached the end.
        </p>
      ) : null}
    </div>
  );
}
