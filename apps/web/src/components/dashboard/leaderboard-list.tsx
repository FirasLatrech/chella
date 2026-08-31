"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  LeaderboardPodium,
  LeaderboardRow,
  type LeaderboardEntry,
} from "@/components/leaderboard";
import { LockedRanks, VISIBLE_RANKS } from "./locked-ranks";

/*
 * The board itself: podium, the rows below it, and the locked preview.
 *
 * Presentational only. This used to carry a SECOND period switcher
 * ("This week / This month / All time") on top of the browser's real one, and
 * it wasn't backed by anything — it re-sorted the same rows client-side and
 * relabelled them, so the page showed two filters that disagreed. Period and
 * tag belong to LeaderboardBrowser, which queries the server for them; this
 * component just renders what it is handed.
 */
export function LeaderboardList({
  entries,
  /** Current board state — keys the cross-fade so switching period animates. */
  transitionKey,
}: {
  entries: LeaderboardEntry[];
  transitionKey?: string;
}) {
  // Only the top VISIBLE_RANKS are real: the podium plus the rows between it
  // and the cut. Everything past that is a locked preview — see LockedRanks.
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3, VISIBLE_RANKS);
  const leadReputation = entries[0]?.reputation ?? 0;
  const lastVisible = entries[Math.min(entries.length, VISIBLE_RANKS) - 1];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
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

        {/* Only gate when there is actually something behind it — on a board
            with five or fewer people the lock would be theatre. */}
        {entries.length > VISIBLE_RANKS ? (
          <LockedRanks
            lastReputation={lastVisible?.reputation ?? 0}
            leadReputation={leadReputation}
            total={entries.length}
          />
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
