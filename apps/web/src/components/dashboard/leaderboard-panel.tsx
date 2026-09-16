import { LeaderboardBrowser } from "./leaderboard-browser";
import { LeaderboardRail } from "./leaderboard-rail";

// The leaderboard intentionally has one all-time view.
export function LeaderboardPanel() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <div className="flex w-full gap-4 px-3 pb-10 md:gap-6 md:px-5">
          <main className="min-w-0 flex-1 pt-1">
            <LeaderboardBrowser />
          </main>
          <div className="hidden w-72 shrink-0 xl:block" />
        </div>
      </div>

      <div className="scroll-slim absolute top-3 right-5 bottom-0 z-40 hidden w-72 overflow-y-auto pb-6 xl:block">
        <LeaderboardRail />
      </div>
    </div>
  );
}
