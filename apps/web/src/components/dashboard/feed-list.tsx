"use client";

import { TabGroup } from "@headlessui/react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { Tabs, TabItem } from "@/components/ui/tabs";
import { FeedItem, type FeedEntry, type FeedKind } from "./feed-item";

const FILTERS: { label: string; kind: FeedKind | "all" }[] = [
  { label: "All", kind: "all" },
  { label: "Questions", kind: "question" },
  { label: "Projects", kind: "project" },
  { label: "Posts", kind: "post" },
];

export function FeedList({ entries }: { entries: FeedEntry[] }) {
  const [filter, setFilter] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const byKind = { all: entries.length, question: 0, project: 0, post: 0 };
    for (const e of entries) byKind[e.kind] += 1;
    return byKind;
  }, [entries]);

  const visible = useMemo(() => {
    const kind = FILTERS[filter].kind;
    return kind === "all" ? entries : entries.filter((e) => e.kind === kind);
  }, [entries, filter]);

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

      <div className="flex flex-col">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((entry) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              <FeedItem entry={entry} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </TabGroup>
  );
}
