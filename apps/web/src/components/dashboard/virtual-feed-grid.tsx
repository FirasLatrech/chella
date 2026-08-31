"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { FeedCard } from "./feed-card";
import type { FeedEntry } from "./feed-item";

// Keyed to the *container's* width (the scroll panel's main column), not the
// viewport — a right-hand rail eats space at `xl` and up, so a
// viewport-width media query would claim 3 columns' worth of room the grid
// doesn't actually have.
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

// 26rem card + 1rem row gap. The gap lives INSIDE each row's box (pb-4) so a
// row measures exactly this — see the note on the virtualizer below.
const CARD_HEIGHT = 416;
const ROW_GAP = 16;
const ROW_HEIGHT = CARD_HEIGHT + ROW_GAP;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

/*
 * Card-grid feed, virtualized by row rather than by card.
 *
 * TanStack Virtual's `lanes` mode assumes equal-height cells and fights
 * dynamic per-card measurement across paged data — chunking entries into
 * fixed-width rows is the boring approach that actually holds up under
 * infinite loading.
 *
 * Rows are a known, constant height (cards are fixed at 26rem), so this list
 * measures NOTHING at runtime: every row's box is ROW_HEIGHT, including its
 * gap. That is what keeps scrolling smooth over a thousand posts.
 */
export function VirtualFeedGrid({
  entries,
  hasMore,
  loadMore,
  loading,
  /** Ref to the scrolling ancestor. */
  scrollRef,
  // Cards are a fixed 26rem (416px) plus the 1rem (16px) row gap, so a row's
  // height is EXACTLY this — not an estimate. Nothing is measured at runtime
  // (see below), so this value must stay in step with the card height.
  estimateSize = ROW_HEIGHT,
}: {
  entries: FeedEntry[];
  hasMore: boolean;
  loadMore: () => void;
  loading: boolean;
  scrollRef: React.RefObject<HTMLElement | null>;
  estimateSize?: number;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const [columns, setColumns] = useState(1);
  const [layout, setLayout] = useState<{ ready: boolean; margin: number }>({
    ready: false,
    margin: 0,
  });

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setColumns(columnsForWidth(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!scrollRef.current || !listRef.current) return;
    setLayout({ ready: true, margin: listRef.current.offsetTop });
  }, [scrollRef]);

  const rows = chunk(entries, columns);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 3,
    // NO measureElement, deliberately. Cards are a fixed height, so every row
    // is exactly ROW_HEIGHT and dynamic measurement is both unnecessary and
    // actively harmful: it read each row back as 416 while the flex gap made
    // the real pitch 432, so the virtualizer's idea of the content drifted
    // 16px per row — about 4000px of accumulated error by the end of 1000
    // posts, which is what made the scrollbar jump and rows slide under the
    // header. It also forced a synchronous layout read per row per frame.
    scrollMargin: layout.margin,
    enabled: layout.ready,
  });

  const items = virtualizer.getVirtualItems();
  const lastIndex = items.length > 0 ? items[items.length - 1].index : 0;
  const measured = layout.ready && items.length > 0;

  // Fetch the next page once the tail rows come into view.
  useEffect(() => {
    if (hasMore && !loading && lastIndex >= rows.length - 2) {
      loadMore();
    }
  }, [hasMore, loading, lastIndex, rows.length, loadMore]);

  const offsetTop = items[0]?.start ?? 0;

  // Matches COLUMN_BREAKPOINTS above — container-width breakpoints, not
  // viewport ones, so this tracks the same box the ResizeObserver measures.
  const gridClass =
    "grid grid-cols-1 gap-3.5 @min-[620px]:grid-cols-2 @min-[1024px]:grid-cols-3 @min-[1500px]:grid-cols-4";

  // Not memoized: the virtualizer's callbacks are recreated per render by
  // design, so caching rows against them would hold stale measurements.
  const virtualRows = items.map((item) => {
    const row = rows[item.index];
    return (
      <div
        key={row[0]?.id ?? item.index}
        // Gap as bottom padding: it belongs inside the row box so the row's
        // height matches ROW_HEIGHT exactly.
        className={`${gridClass} pb-4`}
        style={{ height: ROW_HEIGHT }}
      >
        {row.map((entry) => (
          <FeedCard key={entry.id} entry={entry} />
        ))}
      </div>
    );
  });

  return (
    // overflow-anchor: the browser's scroll anchoring tries to hold a row in
    // place as pages append, which fights the virtualizer's own positioning
    // and shows up as a stutter at each page boundary.
    <div ref={listRef} style={{ overflowAnchor: "none" }}>
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
            className="flex flex-col"
          >
            {virtualRows}
          </div>
        </div>
      ) : (
        <div className={gridClass}>
          {entries.map((entry) => (
            <FeedCard key={entry.id} entry={entry} />
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
