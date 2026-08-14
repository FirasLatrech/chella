"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState, type ReactNode } from "react";

/*
 * Generic virtualized, infinitely-scrolling list.
 *
 * Same machinery as VirtualFeed but row-agnostic: callers supply the render
 * function, so questions, projects and saved can share it. The scroll
 * container is always an ancestor (the panel's .scroll-slim element) — a
 * nested scroller would give the page two scrollbars and break sticky tabs.
 */
export function VirtualList<T extends { id: string }>({
  items,
  renderItem,
  scrollRef,
  hasMore = false,
  loading = false,
  loadMore,
  estimateSize = 116,
  emptyState,
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
  scrollRef: React.RefObject<HTMLElement | null>;
  hasMore?: boolean;
  loading?: boolean;
  loadMore?: () => void;
  estimateSize?: number;
  emptyState?: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // The virtualizer needs a mounted scroll element and this list's offset
  // inside it; neither exists on the server or the first client pass, so we
  // record them after mount and virtualize from the next render on.
  const [layout, setLayout] = useState({ ready: false, margin: 0 });

  useEffect(() => {
    if (!scrollRef.current || !listRef.current) return;
    setLayout({ ready: true, margin: listRef.current.offsetTop });
  }, [scrollRef]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 6,
    measureElement: (el) => el.getBoundingClientRect().height,
    scrollMargin: layout.margin,
    enabled: layout.ready,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastIndex =
    virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].index : 0;
  const measured = layout.ready && virtualItems.length > 0;

  useEffect(() => {
    if (loadMore && hasMore && !loading && lastIndex >= items.length - 4) {
      loadMore();
    }
  }, [loadMore, hasMore, loading, lastIndex, items.length]);

  if (items.length === 0 && !loading) {
    return <>{emptyState ?? null}</>;
  }

  const offsetTop = virtualItems[0]?.start ?? 0;

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
            {virtualItems.map((virtualItem) => (
              <div
                key={items[virtualItem.index].id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
              >
                {renderItem(items[virtualItem.index])}
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Pre-measurement (SSR and first paint): a plain list, so content is
        // visible immediately rather than blank until hydration.
        <div className="flex flex-col">
          {items.map((item) => (
            <div key={item.id}>{renderItem(item)}</div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground py-6 text-center text-xs">
          Loading more…
        </p>
      ) : null}
      {!hasMore && !loading && items.length > 0 ? (
        <p className="text-muted-foreground/70 py-6 text-center text-xs">
          You&rsquo;ve reached the end.
        </p>
      ) : null}
    </div>
  );
}
