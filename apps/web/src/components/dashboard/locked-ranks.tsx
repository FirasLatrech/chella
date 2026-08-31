"use client";

import { LockKeyholeMinimalisticIcon } from "@solar-icons/react/bold-duotone";
import { LeaderboardRow, type LeaderboardEntry } from "@/components/leaderboard";

/*
 * Everything below the visible ranks, as a locked preview.
 *
 * The rows here are INVENTED, not real people whose names have been blurred —
 * a blurred real name is still a real name, and the point of the gate is that
 * ranks past the cut aren't given away. They exist to show the shape of what's
 * behind the lock, so the overlay says plainly that the rest is locked; it
 * never presents these as standings.
 *
 * Same treatment as the jobs board's coming-soon state: blurred, inert,
 * under a wash that makes the blur read as deliberate rather than broken.
 */

/** How many ranks are shown for real before the lock. */
export const VISIBLE_RANKS = 5;

// Fixed, module-level: the preview must render identically on the server and
// the client (a random or time-based filler would hydrate mismatched), and a
// constant array also keeps `memo` further down the tree holding.
const FILLER: { name: string; handle: string; tags: string[] }[] = [
  { name: "Yassine", handle: "yassine", tags: ["Go", "Postgres"] },
  { name: "Emna", handle: "emna", tags: ["React", "Next.js"] },
  { name: "Khalil", handle: "khalil", tags: ["DevOps"] },
  { name: "Rania", handle: "rania", tags: ["AI", "Data"] },
  { name: "Oussama", handle: "oussama", tags: ["Payments"] },
  { name: "Ines", handle: "ines", tags: ["Startup", "Careers"] },
];

/*
 * Points step down from the last real entry so the bars keep descending
 * through the blur — a preview that suddenly re-ranked upward would look
 * wrong even out of focus.
 */
function fillerEntries(
  lastReputation: number,
  remaining: number,
): LeaderboardEntry[] {
  const base = Math.max(lastReputation, 40);
  // As many rows as are actually hidden, so the preview's length matches what
  // the note claims — but at least two, or there isn't enough of a band for
  // the lock to sit in, and capped at the filler we have.
  const count = Math.min(Math.max(remaining, 2), FILLER.length);
  return FILLER.slice(0, count).map((f, i) => ({
    ...f,
    rank: VISIBLE_RANKS + 1 + i,
    reputation: Math.round(base * Math.pow(0.88, i + 1)),
  }));
}

export function LockedRanks({
  lastReputation,
  leadReputation,
  total,
}: {
  /** Points of the last visible entry — the preview steps down from it. */
  lastReputation: number;
  leadReputation: number;
  /** Real number of ranked people, so the note can say what's behind the lock. */
  total: number;
}) {
  const remaining = Math.max(total - VISIBLE_RANKS, 0);

  return (
    <div className="relative mt-1 overflow-hidden">
      {/* The preview: hidden from assistive tech and from the tab order, so
          nobody can reach a person who doesn't exist. */}
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none blur-[5px] select-none"
      >
        <ul className="flex flex-col gap-0.5">
          {fillerEntries(lastReputation, remaining).map((entry) => (
            <LeaderboardRow
              key={entry.handle}
              entry={entry}
              leadReputation={leadReputation}
            />
          ))}
        </ul>
      </div>

      {/* Wash: light at the top so the first blurred row still reads, fully
          opaque before the bottom edge so the board ends on the background
          rather than on a hard cut through a row. */}
      <div className="from-background/20 via-background/75 to-background absolute inset-0 bg-gradient-to-b to-90%" />

      <div className="absolute inset-0 grid place-items-center px-6">
        <div className="bg-muted/70 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px] backdrop-blur-sm">
          <div className="bg-popover ring-border-surface-strong flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 ring-[0.5px]">
            <LockKeyholeMinimalisticIcon size={16} className="text-brand shrink-0" />
            <p className="text-xs">
              <span className="font-medium">
                Top {VISIBLE_RANKS} shown
              </span>
              <span className="text-muted-foreground">
                {remaining > 0
                  ? ` — ${remaining} more ${remaining === 1 ? "rank" : "ranks"} unlock soon`
                  : " — the full board unlocks soon"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
