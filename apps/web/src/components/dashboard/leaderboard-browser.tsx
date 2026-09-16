"use client";

import { useMemo } from "react";
import { LeaderboardList } from "./leaderboard-list";
import { useLeaderboard } from "@/lib/queries";
import { boardParams } from "@/lib/keys";
import type { LeaderboardEntry } from "@/components/leaderboard";

// One simple, all-time board. This keeps rankings easy to understand and
// avoids an empty time window making the page look broken.
export function LeaderboardBrowser() {
  const { data, isFetching } = useLeaderboard(boardParams("all", "all"));

  const entries: LeaderboardEntry[] = useMemo(
    () =>
      (data ?? []).map((e) => ({
        rank: e.rank,
        name: e.name,
        handle: e.handle,
        tags: e.tags,
        reputation: e.reputation,
      })),
    [data],
  );

  return (
    <>
      <div className="mb-3 flex items-center gap-2 px-0.5 py-2">
        <h2 className="text-sm font-semibold">All-time rankings</h2>
        <span
          aria-hidden="true"
          className={`bg-brand size-1.5 rounded-full transition-opacity duration-200 ${
            isFetching ? "animate-pulse opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {entries.length === 0 && !isFetching ? (
        <p className="text-muted-foreground px-3 py-10 text-center text-sm">
          No reputation earned yet.
        </p>
      ) : (
        <LeaderboardList entries={entries} transitionKey="all" />
      )}
    </>
  );
}
