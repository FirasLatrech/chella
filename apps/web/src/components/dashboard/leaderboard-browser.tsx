"use client";

import { TabGroup } from "@headlessui/react";
import { useMemo, useState } from "react";
import { Tabs, TabItem } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { LeaderboardList } from "./leaderboard-list";
import { useFeed, useLeaderboard } from "@/lib/queries";
import { boardParams } from "@/lib/keys";
import type { LeaderboardEntry } from "@/components/leaderboard";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
] as const;

/*
 * The time-based, tag-scoped leaderboard from the product brief. Rankings
 * come from the server's single reputation formula; switching period or tag
 * re-queries the API with the previous board held while loading.
 */
export function LeaderboardBrowser() {
  const [periodIndex, setPeriodIndex] = useState(4); // All time
  const [tag, setTag] = useState("all");

  const period = PERIODS[periodIndex].value;
  const { data, isFetching } = useLeaderboard(boardParams(period, tag));

  const entries: LeaderboardEntry[] = useMemo(
    () =>
      (data ?? []).map((e) => ({
        rank: e.rank,
        name: e.name,
        handle: e.handle,
        tags: e.tags,
        // Windowed boards rank by points earned in the window; show that
        // number as the headline so the ranking is explainable.
        reputation: period === "all" ? e.reputation : e.points,
        change: period === "all" ? undefined : e.points,
      })),
    [data, period],
  );

  const { data: feed } = useFeed();
  const tagOptions = useMemo(() => {
    const unique = [...new Set((feed ?? []).flatMap((e) => e.tags))].sort();
    return [
      { value: "all", label: "All tags" },
      ...unique.map((t) => ({ value: t, label: t })),
    ];
  }, [feed]);

  return (
    <TabGroup selectedIndex={periodIndex} onChange={setPeriodIndex}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tabs>
          {PERIODS.map((p) => (
            <TabItem key={p.value}>{p.label}</TabItem>
          ))}
        </Tabs>
        <span
          aria-hidden="true"
          className={`bg-brand size-1.5 rounded-full transition-opacity duration-200 ${
            isFetching ? "animate-pulse opacity-100" : "opacity-0"
          }`}
        />
        <div className="ml-auto w-36">
          <Select value={tag} onChange={setTag} options={tagOptions} size="sm" />
        </div>
      </div>

      {entries.length === 0 && !isFetching ? (
        <p className="text-muted-foreground px-3 py-10 text-center text-sm">
          No points earned in this window yet — the board is wide open.
        </p>
      ) : (
        <LeaderboardList entries={entries} />
      )}
    </TabGroup>
  );
}
