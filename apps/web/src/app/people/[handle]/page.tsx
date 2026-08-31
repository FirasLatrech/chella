import { notFound } from "next/navigation";
import {
  MedalRibbonStarIcon,
  DocumentTextIcon,
  ArrowUpIcon,
  EyeIcon,
  LinkSquareIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Shell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { FeedItem } from "@/components/dashboard/feed-item";
import { ActivityGraph } from "@/components/dashboard/activity-graph";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EditProfileButton } from "@/components/profile/edit-profile-button";
import { MediaTrigger } from "@/components/ui/media-viewer";
import { BadgeShelf } from "@/components/profile/badge-shelf";
import { fetchProfileStats, requireAuth } from "@/lib/api";
import { formatPoints } from "@/lib/format";

const STATS = [
  {
    key: "posts" as const,
    icon: DocumentTextIcon,
    label: "Contributions",
    tint: "bg-brand/10 text-brand-content",
  },
  {
    key: "votes" as const,
    icon: ArrowUpIcon,
    label: "Votes earned",
    tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
  },
  {
    key: "views" as const,
    icon: EyeIcon,
    label: "Views",
    tint: "bg-amber-500/10 text-amber-700 dark:text-amber-500",
  },
];

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: PageProps<"/people/[handle]">) {
  const { handle } = await params;
  const me = await requireAuth(`/people/${handle}`);
  // Server component on a force-dynamic route — this runs once per request,
  // not a speculative render, so a wall-clock read is safe here.
  // eslint-disable-next-line react-hooks/purity
  const today = Date.now();
  const profile = await fetchProfileStats(handle);
  if (!profile) notFound();

  return (
    <Shell>
      <PageHeader title="Profile" />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
          <div className="w-full px-3 pb-16 md:px-5">
            <main className="mt-1 min-w-0">
              {/* Identity — frame-inside-tint, matching Card/JobCard. */}
              <div className="bg-muted/60 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px]">
                <div className="bg-surface-primary ring-border-surface-strong flex flex-col items-center gap-4 rounded-xl p-6 text-center ring-[0.5px] sm:flex-row sm:text-left">
                  <Avatar seed={profile.handle} src={profile.avatar} size="xl" className="size-20" />
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-semibold tracking-tight">
                      {profile.name}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      @{profile.handle}
                    </p>
                    {profile.bio ? (
                      <p className="text-foreground/80 mt-1.5 text-sm text-pretty">
                        {profile.bio}
                      </p>
                    ) : null}
                    <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                      {/* "#2 React" — rank on that tag's all-time board. */}
                      {profile.tagRanks.map((tr) => (
                        <Badge key={tr.tag} variant="brand" className="text-[10px]">
                          #{tr.rank} {tr.tag}
                        </Badge>
                      ))}
                      {profile.tags
                        .filter((t) => !profile.tagRanks.some((tr) => tr.tag === t))
                        .map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                    </div>
                    {profile.links.length > 0 || profile.cvUrl ? (
                      <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                        {profile.cvUrl ? (
                          <MediaTrigger
                            src={profile.cvUrl}
                            label="View CV"
                            className={cn(
                              "bg-brand/10 text-brand-content hover:bg-brand/15 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                              "transition-colors",
                            )}
                          >
                            <DocumentTextIcon size={13} />
                            CV
                          </MediaTrigger>
                        ) : null}
                        {profile.links.map((link) => (
                          <a
                            key={link.platform}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "bg-secondary hover:bg-accent flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                              "transition-colors",
                            )}
                          >
                            <LinkSquareIcon
                              size={13}
                              className="text-muted-foreground"
                            />
                            {link.platform}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1 sm:items-end">
                    <span className="text-brand-content flex items-center gap-1 text-lg font-semibold tabular-nums">
                      <MedalRibbonStarIcon size={18} className="text-amber-500" />
                      #{profile.rank}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatPoints(profile.reputation)} rep
                    </span>
                    {me.handle === profile.handle ? <EditProfileButton /> : null}
                  </div>
                </div>
              </div>

              {/* Stat row — icon tile beside the number, colour-coded per
                  stat rather than one uniform brand blue. */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {STATS.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.key}
                      className="bg-muted/60 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px]"
                    >
                      <div className="bg-surface-primary ring-border-surface-strong flex items-center gap-3 rounded-xl p-3.5 ring-[0.5px]">
                        <div
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-lg",
                            stat.tint,
                          )}
                        >
                          <Icon size={19} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xl leading-none font-semibold tabular-nums">
                            {formatPoints(profile[stat.key])}
                          </div>
                          <div className="text-muted-foreground mt-1 truncate text-xs">
                            {stat.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {profile.badges.length > 0 ? (
                <div className="mt-4">
                  <BadgeShelf badges={profile.badges} />
                </div>
              ) : null}

              <div className="mt-4">
                <ActivityGraph days={profile.activity.days} today={today} />
              </div>

              {/* Contributions — same row component as the feed. */}
              <div className="mt-4">
                <h2 className="text-muted-foreground mt-2 mb-1 px-1 text-xs font-medium tracking-wide uppercase">
                  Contributions
                </h2>
                {profile.entries.length > 0 ? (
                  <div className="flex flex-col">
                    {profile.entries.map((entry) => (
                      <FeedItem key={entry.id} entry={entry} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground px-1 py-10 text-center text-sm">
                    No contributions yet.
                  </p>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </Shell>
  );
}
