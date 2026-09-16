"use client";

import { useState } from "react";
import { LeaderboardBrowser } from "./leaderboard-browser";
import { LeaderboardRail } from "./leaderboard-rail";

const PERIODS = ["today", "week", "month", "year", "all"] as const;

// One owner for the page filters means the main board and its side rail can
// never disagree about which time window or tag is being shown.
export function LeaderboardPanel() {
  const [periodIndex, setPeriodIndex] = useState(4);
  const [tag, setTag] = useState("all");
  const period = PERIODS[periodIndex] ?? "all";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <div className="flex w-full gap-4 px-3 pb-10 md:gap-6 md:px-5">
          <main className="min-w-0 flex-1 pt-1">
            <LeaderboardBrowser
              periodIndex={periodIndex}
              onPeriodChange={setPeriodIndex}
              tag={tag}
              onTagChange={setTag}
            />
          </main>
          <div className="hidden w-72 shrink-0 xl:block" />
        </div>
      </div>

      <div className="scroll-slim absolute top-3 right-5 bottom-0 z-40 hidden w-72 overflow-y-auto pb-6 xl:block">
        <LeaderboardRail period={period} tag={tag} />
      </div>
    </div>
  );
}
