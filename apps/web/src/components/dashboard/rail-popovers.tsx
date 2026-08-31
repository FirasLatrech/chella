"use client";

import Link from "next/link";
import { formatPoints } from "@/lib/format";
import {
  CupStarIcon,
  HashtagIcon,
  GraphUpIcon,
  AltArrowRightIcon,
  AltArrowUpIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { HoverPopover } from "@/components/ui/hover-popover";
import type { TopContributor, TrendingTag, Me } from "@/lib/api";

// Podium colours, matching the leaderboard's medal treatment.
const PODIUM: Record<number, string> = {
  1: "text-amber-500",
  2: "text-neutral-400",
  3: "text-amber-700",
};

function RailIconTrigger({
  icon: Icon,
  tint,
  label,
}: {
  icon: typeof CupStarIcon;
  tint: string;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl transition-colors",
        tint,
      )}
    >
      <Icon size={17} />
    </button>
  );
}

function PanelHeader({
  icon: Icon,
  tint,
  title,
}: {
  icon: typeof CupStarIcon;
  tint: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-1">
      <Icon size={15} className={tint} />
      <span className="text-sm font-semibold tracking-tight">{title}</span>
    </div>
  );
}

/*
 * Client-side icon triggers for the two rail panels — hover reveals the same
 * content that used to sit permanently in the right-hand rail, now folded
 * into a popover so the feed can run full width.
 */
export function RailPopovers({
  me,
  contributors,
  tags,
}: {
  me: Me | null;
  contributors: TopContributor[];
  tags: TrendingTag[];
}) {
  const maxPosts = Math.max(1, ...tags.map((t) => t.posts));

  return (
    <div className="flex items-center gap-1.5">
      <HoverPopover
        trigger={
          <RailIconTrigger
            icon={CupStarIcon}
            tint="bg-amber-500/10 text-amber-500 hover:bg-amber-500/15"
            label="Top this week"
          />
        }
      >
        <PanelHeader icon={CupStarIcon} tint="text-amber-500" title="Top this week" />
        <div className="p-0.5">
          {contributors.length === 0 ? (
            <p className="text-muted-foreground px-2 py-3 text-xs">
              No activity yet this week — be the first.
            </p>
          ) : (
            contributors.map((user, i) => {
              const you = me?.handle === user.handle;
              return (
                <Link
                  key={user.handle}
                  href={`/people/${user.handle}`}
                  className="hover:bg-accent/70 flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors"
                >
                  <span
                    className={cn(
                      "w-4 text-center text-xs font-semibold tabular-nums",
                      PODIUM[i + 1] ?? "text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <Avatar
                    seed={user.handle}
                    size="sm"
                    className={cn(you && "ring-brand/50 ring-2")}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {user.name}
                      </span>
                      {you ? (
                        <span className="bg-brand/10 text-brand-content rounded-full px-1.5 text-[10px] font-medium">
                          You
                        </span>
                      ) : null}
                    </div>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatPoints(user.reputation)} rep
                    </span>
                  </div>
                  {user.weekly > 0 ? (
                    <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 tabular-nums dark:text-emerald-500">
                      <AltArrowUpIcon size={11} />
                      {user.weekly}
                    </span>
                  ) : null}
                </Link>
              );
            })
          )}
        </div>
        <div className="border-border/70 flex justify-center border-t pt-1.5 pb-0.5">
          <Link
            href="/leaderboard"
            className="hover:text-foreground group flex items-center gap-1 py-1 text-[11px] transition-colors"
          >
            Full leaderboard
            <AltArrowRightIcon
              size={12}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </HoverPopover>

      <HoverPopover
        trigger={
          <RailIconTrigger
            icon={GraphUpIcon}
            tint="bg-brand/10 text-brand hover:bg-brand/15"
            label="Trending tags"
          />
        }
      >
        <PanelHeader icon={GraphUpIcon} tint="text-brand" title="Trending tags" />
        <div className="p-0.5">
          {tags.length === 0 ? (
            <p className="text-muted-foreground px-2 py-3 text-xs">
              Nothing posted this week yet.
            </p>
          ) : (
            tags.map((tag) => (
              <Link
                key={tag.name}
                // /questions and /projects are both gone — the feed is the
                // one list, and it filters by ?tag=.
                href={`/?tag=${encodeURIComponent(tag.name)}`}
                className="hover:bg-accent/70 group flex flex-col gap-1.5 rounded-lg px-2 py-2 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <HashtagIcon
                    size={13}
                    className="text-muted-foreground shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {tag.name}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {tag.posts}
                  </span>
                  {tag.prev === 0 ? (
                    <span className="bg-brand/10 text-brand-content rounded-full px-1.5 text-[10px] font-medium">
                      new
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
                        tag.growth >= 0
                          ? "text-emerald-600 dark:text-emerald-500"
                          : "text-muted-foreground",
                      )}
                    >
                      <AltArrowUpIcon
                        size={10}
                        className={cn(tag.growth < 0 && "rotate-180")}
                      />
                      {Math.abs(tag.growth)}%
                    </span>
                  )}
                </span>
                {/* Relative weekly volume, as a quiet 2px bar. */}
                <span className="bg-brand/10 block h-0.5 overflow-hidden rounded-full">
                  <span
                    className="bg-brand block h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${(tag.posts / maxPosts) * 100}%` }}
                  />
                </span>
              </Link>
            ))
          )}
        </div>
      </HoverPopover>
    </div>
  );
}
