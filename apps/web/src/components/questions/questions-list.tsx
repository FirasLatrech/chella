"use client";

import { TabGroup } from "@headlessui/react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { Tabs, TabItem } from "@/components/ui/tabs";
import { QuestionRow, type QuestionEntry } from "./question-row";
import { useFeed } from "@/lib/queries";
import { questionsFromFeed } from "@/lib/derive";

const FILTERS = [
  { label: "Newest", match: () => true },
  {
    label: "Unanswered",
    match: (q: QuestionEntry) => q.answers === 0,
  },
  { label: "Solved", match: (q: QuestionEntry) => Boolean(q.solved) },
] as const;

export function QuestionsList() {
  const { data: feed = [] } = useFeed();
  const entries = useMemo(() => questionsFromFeed(feed), [feed]);
  const [filter, setFilter] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

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
              <QuestionRow entry={entry} />
            </motion.div>
          ))}
        </AnimatePresence>

        {visible.length === 0 ? (
          <p className="text-muted-foreground px-3 py-10 text-center text-sm">
            Nothing here — every question has an answer. 🎉
          </p>
        ) : null}
      </div>
    </TabGroup>
  );
}
