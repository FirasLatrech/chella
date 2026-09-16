"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { FeedCard } from "./feed-card";
import type { FeedEntry } from "./feed-item";

const GAP = 16;
const ESTIMATED_CARD_HEIGHT = 360;

const COLUMN_BREAKPOINTS: { minWidth: number; columns: number }[] = [
  { minWidth: 1500, columns: 4 },
  { minWidth: 1024, columns: 3 },
  { minWidth: 620, columns: 2 },
];

function columnsForWidth(width: number) {
  for (const { minWidth, columns } of COLUMN_BREAKPOINTS) {
    if (width >= minWidth) return columns;
  }
  return 1;
}

/*
 * Virtual masonry feed. TanStack Virtual assigns each card to its shortest
 * lane; measured card heights then move later cards up, leaving no empty grid
 * cells. Only the cards around the viewport are mounted.
 */
export function VirtualFeedGrid({
  entries,
  hasMore,
  loadMore,
  loading,
  scrollRef,
}: {
  entries: FeedEntry[];
  hasMore: boolean;
  loadMore: () => void;
  loading: boolean;
  scrollRef: React.RefObject<HTMLElement | null>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ ready: false, width: 0, margin: 0 });
  const columns = columnsForWidth(layout.width);
  const cardWidth = Math.max(0, (layout.width - GAP * (columns - 1)) / columns);

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setLayout((current) => ({
        ...current,
        width: entry.contentRect.width,
        margin: element.offsetTop,
        ready: true,
      }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    getItemKey: (index) => entries[index]?.id ?? index,
    lanes: columns,
    gap: GAP,
    overscan: 6,
    scrollMargin: layout.margin,
    enabled: layout.ready,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  const items = virtualizer.getVirtualItems();
  const furthestIndex = items.reduce((highest, item) => Math.max(highest, item.index), 0);

  useEffect(() => {
    if (hasMore && !loading && furthestIndex >= entries.length - columns * 2) {
      loadMore();
    }
  }, [hasMore, loading, furthestIndex, entries.length, columns, loadMore]);

  const fallbackClass =
    "columns-1 gap-4 @min-[620px]:columns-2 @min-[1024px]:columns-3 @min-[1500px]:columns-4";

  return (
    <div ref={listRef} style={{ overflowAnchor: "none" }}>
      {layout.ready ? (
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {items.map((item) => {
            const entry = entries[item.index];
            if (!entry) return null;
            return (
              <div
                key={item.key}
                ref={virtualizer.measureElement}
                data-index={item.index}
                className="absolute top-0"
                style={{
                  width: cardWidth,
                  left: item.lane * (cardWidth + GAP),
                  transform: `translateY(${item.start - layout.margin}px)`,
                }}
              >
                <FeedCard entry={entry} />
              </div>
            );
          })}
        </div>
      ) : (
        // Server-rendered first paint stays useful; the virtual lanes take
        // over as soon as the feed container has a measured width.
        <div className={fallbackClass}>
          {entries.map((entry) => (
            <FeedCard key={entry.id} entry={entry} className="mb-4 break-inside-avoid" />
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
