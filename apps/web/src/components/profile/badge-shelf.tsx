import {
  MedalRibbonStarIcon,
  CupStarIcon,
  BoltIcon,
  CodeSquareIcon,
  HeartAngleIcon,
  CalendarMarkIcon,
  HandStarsIcon,
  StarFallMinimalisticIcon,
  CheckCircleIcon,
} from "@solar-icons/react/bold-duotone";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export interface ProfileBadge {
  slug: string;
  label: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | string;
  count?: number;
}

const ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  "tag-leader": MedalRibbonStarIcon,
  "tag-top-ten": CupStarIcon,
  "problem-solver": CheckCircleIcon,
  helper: HandStarsIcon,
  "quick-draw": BoltIcon,
  builder: CodeSquareIcon,
  "well-received": HeartAngleIcon,
  regular: CalendarMarkIcon,
  "good-citizen": StarFallMinimalisticIcon,
  "first-steps": StarFallMinimalisticIcon,
};

const TIERS: Record<string, string> = {
  gold: "bg-amber-500/10 text-amber-700 dark:text-amber-500 ring-amber-500/20",
  silver: "bg-muted text-foreground/70 ring-border-surface-strong",
  bronze: "bg-orange-500/8 text-orange-700/80 dark:text-orange-500/80 ring-orange-500/15",
};

/*
 * Badges earned from real activity. Every one is derived server-side from
 * the domain tables (apps/api/badges.go), so a badge can't outlive the
 * contributions that earned it.
 */
export function BadgeShelf({ badges }: { badges: ProfileBadge[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="bg-muted/60 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px]">
      <div className="bg-surface-primary ring-border-surface-strong rounded-xl p-4 ring-[0.5px]">
        <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          Badges
        </h2>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => {
            const Icon = ICONS[badge.slug] ?? StarFallMinimalisticIcon;
            return (
              <span
                key={badge.slug}
                title={badge.description}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-[0.5px]",
                  TIERS[badge.tier] ?? TIERS.bronze,
                )}
              >
                <Icon size={13} />
                {badge.label}
                {badge.count && badge.slug !== "tag-top-ten" ? (
                  <span className="tabular-nums opacity-70">
                    ×{badge.count}
                  </span>
                ) : null}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
