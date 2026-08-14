"use client";

import { TabGroup } from "@headlessui/react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { Tabs, TabItem } from "@/components/ui/tabs";
import {
  LeaderboardPodium,
  LeaderboardRow,
  type LeaderboardEntry,
} from "@/components/leaderboard";

const PERIODS = ["This week", "This month", "All time"] as const;

export function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  const [period, setPeriod] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  // No live per-period data yet — same ranking, re-sorted for "This week"
  // by recent movement so the filter still feels meaningful.
  const ranked = useMemo(() => {
    if (period !== 0) return entries;
    return [...entries]
      .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [entries, period]);

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const leadReputation = ranked[0]?.reputation ?? 0;

  function onChange(next: number) {
    setPeriod(next);
    topRef.current
      ?.closest(".scroll-slim")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <TabGroup selectedIndex={period} onChange={onChange}>
      <div ref={topRef} />

      <div className="bg-background/85 sticky top-0 z-20 -mx-3 mb-1 flex items-center justify-between px-3 py-2 backdrop-blur-md">
        <Tabs>
          {PERIODS.map((label) => (
            <TabItem key={label}>{label}</TabItem>
          ))}
        </Tabs>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={period}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        >
          {podium.length === 3 ? <LeaderboardPodium entries={podium} /> : null}

          <ul className="flex flex-col gap-0.5">
            {rest.map((entry) => (
              <LeaderboardRow
                key={entry.handle}
                entry={entry}
                leadReputation={leadReputation}
              />
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </TabGroup>
  );
}
