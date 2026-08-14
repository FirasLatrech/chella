"use client";

import Link from "next/link";
import { TabGroup } from "@headlessui/react";
import { useMemo, useState } from "react";
import { BookmarkIcon } from "@solar-icons/react/bold-duotone";
import { Tabs, TabItem } from "@/components/ui/tabs";
import { FeedItem, type FeedKind } from "@/components/dashboard/feed-item";
import { useSaved } from "@/lib/queries";

const FILTERS: { value: FeedKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "question", label: "Questions" },
  { value: "project", label: "Projects" },
  { value: "post", label: "Posts" },
];

/*
 * The bookmarks list — same rows as the feed (including their save buttons,
 * so un-saving here removes the row), filtered by kind on the client.
 */
export function SavedList() {
  const { data } = useSaved();
  const [filterIndex, setFilterIndex] = useState(0);
  const filter = FILTERS[filterIndex].value;

  const entries = useMemo(
    () => (data ?? []).filter((e) => filter === "all" || e.kind === filter),
    [data, filter],
  );

  // Bookmarks the API already dropped (post deleted) simply don't come back.
  const total = data?.length ?? 0;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-3 py-20 text-center">
        <div className="bg-brand/10 text-brand-content grid size-12 place-items-center rounded-2xl">
          <BookmarkIcon size={22} />
        </div>
        <div>
          <p className="text-sm font-medium">Nothing saved yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Tap the bookmark on any post to keep it here.
          </p>
        </div>
        <Link
          href="/"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 mt-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        >
          Browse the feed
        </Link>
      </div>
    );
  }

  return (
    <TabGroup selectedIndex={filterIndex} onChange={setFilterIndex}>
      <div className="mb-2 flex items-center gap-3">
        <Tabs>
          {FILTERS.map((f) => (
            <TabItem key={f.value}>{f.label}</TabItem>
          ))}
        </Tabs>
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {total} saved
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground px-3 py-14 text-center text-sm">
          No saved {FILTERS[filterIndex].label.toLowerCase()} yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {entries.map((entry) => (
            <FeedItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </TabGroup>
  );
}
