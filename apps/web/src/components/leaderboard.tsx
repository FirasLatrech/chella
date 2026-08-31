import Link from "next/link";
import {
  CupStarIcon,
  MedalRibbonStarIcon,
  AltArrowUpIcon,
  AltArrowDownIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";

export interface LeaderboardEntry {
  rank: number;
  name: string;
  handle: string;
  tags: string[];
  reputation: number;
  /** Positions gained (+) or lost (-) since the last period. */
  change?: number;
}

// Podium colours, glow and step height — 1st reads taller and warmer than
// 2nd/3rd, same medal language the rail already uses.
const PODIUM_STYLE: Record<
  number,
  { text: string; ring: string; glow: string; step: string }
> = {
  1: {
    text: "text-amber-500",
    ring: "ring-amber-400/40",
    glow: "bg-amber-400/15",
    step: "h-24",
  },
  2: {
    text: "text-neutral-400",
    ring: "ring-neutral-400/30",
    glow: "bg-neutral-400/10",
    step: "h-16",
  },
  3: {
    text: "text-amber-700 dark:text-amber-600",
    ring: "ring-amber-700/25",
    glow: "bg-amber-700/10",
    step: "h-11",
  },
};

function Change({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-muted-foreground/50 text-xs">—</span>;
  }
  const up = value > 0;
  const Arrow = up ? AltArrowUpIcon : AltArrowDownIcon;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs tabular-nums",
        up ? "text-emerald-600 dark:text-emerald-500" : "text-muted-foreground",
      )}
    >
      <Arrow size={12} />
      {Math.abs(value)}
    </span>
  );
}

/*
 * Podium — the top three as a physical stand, not a table row. Avatar,
 * medal and name float above a step whose height encodes rank, with the
 * numeral carved into the step itself. 1st sits center, tallest.
 */
export function LeaderboardPodium({
  entries,
  linked = true,
}: {
  entries: LeaderboardEntry[];
  /** Landing stage is a picture of the board — same stand, no profile hops. */
  linked?: boolean;
}) {
  // Visual order (2nd, 1st, 3rd) so 1st sits center and tallest.
  const [first, second, third] = entries;
  const order = [second, first, third].filter(Boolean);

  return (
    <div className="flex items-end justify-center gap-2 px-4 pt-6 pb-1 sm:gap-3">
      {order.map((entry) => {
        const style = PODIUM_STYLE[entry.rank] ?? PODIUM_STYLE[3];
        const isFirst = entry.rank === 1;
        const person = (
          <>
            <div className="relative">
              <div
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 -z-10 scale-150 rounded-full blur-xl",
                  style.glow,
                )}
              />
              <Avatar
                seed={entry.handle}
                size={isFirst ? "xl" : "lg"}
                className={cn("ring-4", style.ring)}
              />
              <div className="bg-background absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full shadow-sm">
                {isFirst ? (
                  <CupStarIcon size={16} className={style.text} />
                ) : (
                  <MedalRibbonStarIcon size={14} className={style.text} />
                )}
              </div>
            </div>

            <span className="mt-2.5 max-w-full truncate text-sm font-semibold tracking-tight">
              {entry.name}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatPoints(entry.reputation)}
            </span>
          </>
        );
        return (
          <div
            key={entry.handle}
            className="flex w-24 flex-col items-center sm:w-28"
          >
            {linked ? (
              <Link
                href={`/people/${entry.handle}`}
                className="flex flex-col items-center transition-opacity hover:opacity-80"
              >
                {person}
              </Link>
            ) : (
              <div className="flex flex-col items-center">{person}</div>
            )}

            {/* The step itself — height encodes rank, numeral carved in. */}
            <div
              className={cn(
                "bg-muted/60 ring-border-surface-strong relative mt-3 flex w-full items-start justify-center overflow-hidden rounded-t-xl pt-1.5 ring-[0.5px]",
                style.step,
              )}
            >
              <span
                className={cn(
                  "text-4xl font-bold tracking-tight opacity-25",
                  style.text,
                )}
              >
                {entry.rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/*
 * Rows below the podium — rank is implied by position and a filled bar
 * (relative to the leader), not a printed numeral. Same visual language as
 * the rail's trending-tags volume bar.
 */
export function LeaderboardRow({
  entry,
  leadReputation,
  linked = true,
}: {
  entry: LeaderboardEntry;
  leadReputation: number;
  linked?: boolean;
}) {
  const share = leadReputation > 0 ? entry.reputation / leadReputation : 0;
  const body = (
    <>
      <div className="flex items-center gap-3">
        <Avatar seed={entry.handle} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate text-sm font-medium">{entry.name}</span>
            <span className="text-muted-foreground truncate text-xs">
              @{entry.handle}
            </span>
          </div>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
            {entry.tags.map((tag, i) => (
              <span key={tag} className="truncate">
                {i > 0 ? <span className="mr-1 opacity-40">·</span> : null}
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-sm font-semibold tabular-nums">
            {formatPoints(entry.reputation)}
          </span>
          {entry.change === undefined ? null : <Change value={entry.change} />}
        </div>
      </div>

      <span className="bg-brand/10 block h-0.5 overflow-hidden rounded-full">
        <span
          className="bg-brand/70 group-hover:bg-brand block h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(share * 100, 3)}%` }}
        />
      </span>
    </>
  );

  return (
    <li>
      {linked ? (
        <Link
          href={`/people/${entry.handle}`}
          className="hover:bg-accent/60 group flex flex-col gap-2 rounded-lg px-2 py-2.5 transition-colors"
        >
          {body}
        </Link>
      ) : (
        <div className="group flex flex-col gap-2 rounded-lg px-2 py-2.5">
          {body}
        </div>
      )}
    </li>
  );
}

export function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  const leadReputation = entries[0]?.reputation ?? 0;
  return (
    <ul className="flex flex-col gap-0.5">
      {entries.map((e) => (
        <LeaderboardRow key={e.handle} entry={e} leadReputation={leadReputation} />
      ))}
    </ul>
  );
}
