"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/*
 * GitHub-style contribution graph over real daily activity counts from
 * GET /api/users/{handle}/activity (posts + replies + votes cast, keyed
 * YYYY-MM-DD in UTC). The grid always ends on today's column.
 */
const WEEKS = 53;
const DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const LEVELS = [
  "bg-muted",
  "bg-brand/25",
  "bg-brand/50",
  "bg-brand/75",
  "bg-brand",
];

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Count → intensity bucket. Fixed thresholds read the same on every profile.
function levelFor(count: number) {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ActivityGraph({
  days,
  today,
}: {
  /** Daily contribution counts keyed YYYY-MM-DD (UTC). */
  days: Record<string, number>;
  /** Epoch ms for "today" — passed in since Date.now() varies per render. */
  today: number;
}) {
  const cells = useMemo(() => {
    const totalDays = WEEKS * DAYS;
    const out: { level: number; count: number; date: Date }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const daysFromEnd = totalDays - 1 - i;
      const date = new Date(today - daysFromEnd * DAY_MS);
      const count = days[isoDay(date)] ?? 0;
      out.push({ level: levelFor(count), count, date });
    }
    return out;
  }, [days, today]);

  const totalContributions = useMemo(
    () => cells.reduce((sum, c) => sum + c.count, 0),
    [cells],
  );

  const [hovered, setHovered] = useState<number | null>(null);

  // Month labels: one per week column where the month changes.
  const monthMarks = useMemo(() => {
    const marks: { week: number; label: string }[] = [];
    let lastMonth = -1;
    for (let week = 0; week < WEEKS; week++) {
      const month = cells[week * DAYS]?.date.getMonth() ?? -1;
      if (month !== lastMonth) {
        marks.push({ week, label: MONTH_LABELS[month] });
        lastMonth = month;
      }
    }
    return marks;
  }, [cells]);

  return (
    <div className="bg-muted/60 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px]">
      <div className="bg-surface-primary ring-border-surface-strong rounded-xl p-4 ring-[0.5px]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">
            {totalContributions.toLocaleString()} contribution
            {totalContributions === 1 ? "" : "s"} in the last year
          </h2>
          <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
            Less
            {LEVELS.map((level, i) => (
              <span key={i} className={cn("size-2.5 rounded-[3px]", level)} />
            ))}
            More
          </div>
        </div>

        <div className="w-full pt-9">
          <div className="text-muted-foreground relative -mt-9 mb-1 h-3.5 text-[10px]">
            {monthMarks.map((mark) => (
              <span
                key={mark.week}
                className="absolute"
                style={{ left: `${(mark.week / WEEKS) * 100}%` }}
              >
                {mark.label}
              </span>
            ))}
          </div>

          <div
            className="relative grid w-full gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${DAYS}, minmax(0, 1fr))`,
              gridAutoFlow: "column",
            }}
            onMouseLeave={() => setHovered(null)}
          >
            {cells.map((cell, i) => {
              const week = Math.floor(i / DAYS);
              // Flip the tooltip's horizontal anchor near the grid edges so
              // it never runs off the panel.
              const edge =
                week < 4 ? "left-0 translate-x-0" : week > WEEKS - 5
                  ? "right-0 left-auto translate-x-0"
                  : "left-1/2 -translate-x-1/2";
              const arrowEdge =
                week < 4
                  ? "left-3"
                  : week > WEEKS - 5
                    ? "right-3 left-auto"
                    : "left-1/2 -translate-x-1/2";

              return (
                <div key={i} className="group/cell relative">
                  <div
                    onMouseEnter={() => setHovered(i)}
                    className={cn(
                      "aspect-square w-full rounded-[3px] transition-transform",
                      LEVELS[cell.level],
                      hovered === i && "scale-125",
                    )}
                  />
                  {hovered === i ? (
                    <div
                      role="tooltip"
                      className={cn(
                        "bg-popover text-popover-foreground ring-border-surface-strong pointer-events-none absolute bottom-full z-50 mb-2.5 rounded-lg px-2.5 py-1.5 ring-[0.5px]",
                        "shadow-lg shadow-black/15 text-center whitespace-nowrap",
                        edge,
                      )}
                    >
                      <span className="block text-xs font-medium">
                        {cell.count > 0
                          ? `${cell.count} contribution${cell.count === 1 ? "" : "s"}`
                          : "No contributions"}
                      </span>
                      <span className="text-muted-foreground block text-[11px]">
                        {formatDate(cell.date)}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "bg-popover absolute top-full size-2 -translate-y-1/2 rotate-45 shadow-sm",
                          arrowEdge,
                        )}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
