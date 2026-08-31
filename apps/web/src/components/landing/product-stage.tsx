import {
  QuestionCircleIcon,
  FolderWithFilesIcon,
  DocumentTextIcon,
  ChatRoundDotsIcon,
  EyeIcon,
  AltArrowUpIcon,
  CaseMinimalisticIcon,
  MapPointIcon,
  ClockCircleIcon,
  BanknoteIcon,
  MedalRibbonStarIcon,
} from "@solar-icons/react/bold-duotone";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LeaderboardPodium,
  LeaderboardRow,
  type LeaderboardEntry,
} from "@/components/leaderboard";

type Kind = "question" | "project" | "post";

const KIND: Record<
  Kind,
  { icon: ComponentType<{ size?: number; className?: string }> }
> = {
  question: { icon: QuestionCircleIcon },
  project: { icon: FolderWithFilesIcon },
  post: { icon: DocumentTextIcon },
};

const POSTS = [
  {
    kind: "question" as const,
    author: "sarra",
    title: "How do you structure a Go service that talks to both Postgres and Redis?",
    tags: ["Go", "Postgres"],
    excerpt:
      "I keep ending up with two clients and no clear owner for the transaction boundary. What has actually held up in production?",
    votes: 24,
    replies: 11,
    views: 860,
    time: "2h",
  },
  {
    kind: "project" as const,
    author: "ahmed",
    title: "tounes-cli — open data for Tunisia, as a single command",
    tags: ["Go", "CLI"],
    excerpt:
      "One binary. Municipal budgets, election results, and transport feeds. No account, no dashboard — just the data.",
    votes: 41,
    replies: 8,
    views: 1200,
    time: "5h",
  },
  {
    kind: "post" as const,
    author: "nour",
    title: "Notes from shipping a design system that engineers actually open",
    tags: ["Design", "Frontend"],
    excerpt:
      "The rule that stuck: one file owns control height. Everything else inherits.",
    votes: 18,
    replies: 6,
    views: 540,
    time: "1d",
  },
];

const PROJECTS = [
  POSTS[1],
  {
    kind: "project" as const,
    author: "mehdi",
    title: "sfax-mesh — a tiny service mesh for campus networks",
    tags: ["Go", "DevOps"],
    excerpt:
      "mTLS by default, one YAML file, runs on a Raspberry Pi. Built for the lab, used in production.",
    votes: 33,
    replies: 5,
    views: 740,
    time: "1d",
  },
  {
    kind: "project" as const,
    author: "firas",
    title: "chelaa-api — the Go backend this feed runs on",
    tags: ["Go", "Postgres"],
    excerpt:
      "net/http, pgx, no framework. Reputation is one function. Everything else reads from the tables.",
    votes: 56,
    replies: 14,
    views: 2100,
    time: "3d",
  },
];

const LEADERS: LeaderboardEntry[] = [
  { rank: 1, name: "Ahmed", handle: "ahmed", tags: ["Go", "Next.js"], reputation: 8420, change: 2 },
  { rank: 2, name: "Firas", handle: "firas", tags: ["React", "Go"], reputation: 7920, change: 1 },
  { rank: 3, name: "Sarra", handle: "sarra", tags: ["Python", "AI"], reputation: 6510, change: -1 },
  { rank: 4, name: "Mehdi", handle: "mehdi", tags: ["DevOps"], reputation: 5980, change: 0 },
  { rank: 5, name: "Nour", handle: "nour", tags: ["Design"], reputation: 5240, change: 3 },
];

const JOBS = [
  {
    title: "Senior Go Engineer",
    company: "InstaDeep",
    location: "Tunis",
    arrangement: "Hybrid",
    kind: "Full-time",
    pay: "8–12k TND",
    tags: ["Go", "Postgres", "gRPC"],
    match: "#1 Go",
    time: "2d",
  },
  {
    title: "Design Engineer",
    company: "Verto",
    location: "Remote",
    arrangement: "Remote",
    kind: "Full-time",
    pay: "6–9k TND",
    tags: ["React", "Design", "TypeScript"],
    match: null,
    time: "5d",
  },
  {
    title: "Frontend · Next.js",
    company: "Konnect",
    location: "Tunis",
    arrangement: "On-site",
    kind: "Full-time",
    pay: "5–8k TND",
    tags: ["Next.js", "TypeScript"],
    match: "#4 React",
    time: "1w",
  },
];

function StageCard({ post }: { post: (typeof POSTS)[number] }) {
  const kind = KIND[post.kind];
  const KindIcon = kind.icon;

  return (
    <article
      className={cn(
        "bg-card ring-border-surface-strong flex flex-col rounded-2xl p-4",
        "ring-[0.5px] shadow-sm shadow-black/[0.03]",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="bg-brand/10 text-brand-content grid size-7 shrink-0 place-items-center rounded-lg">
          <KindIcon size={15} />
        </div>
        <Avatar seed={post.author} size="xs" />
        <span className="text-muted-foreground truncate text-xs">
          @{post.author}
        </span>
        <span className="text-muted-foreground/70 ml-auto text-[11px]">
          {post.time}
        </span>
      </div>
      <h3 className="mt-3 line-clamp-2 h-[2.75em] text-[15px] leading-snug font-semibold tracking-tight">
        {post.title}
      </h3>
      <div className="mt-2.5 flex h-[1.375rem] items-center gap-1.5 overflow-hidden">
        {post.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px]">
            {tag}
          </Badge>
        ))}
      </div>
      <p className="text-muted-foreground mt-3 line-clamp-3 text-xs leading-relaxed text-pretty">
        {post.excerpt}
      </p>
      <div className="border-border/70 mt-3.5 flex items-center gap-3 border-t pt-3">
        <span className="text-foreground flex items-center gap-1 text-xs font-medium tabular-nums">
          <AltArrowUpIcon size={13} />
          {formatPoints(post.votes)}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs tabular-nums">
          <ChatRoundDotsIcon size={13} />
          {formatPoints(post.replies)}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs tabular-nums">
          <EyeIcon size={13} />
          {formatPoints(post.views)}
        </span>
      </div>
    </article>
  );
}

function StageShell({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-background ring-border-surface-strong flex h-full min-h-0 flex-col overflow-hidden ring-[0.5px]">
      <div className="flex shrink-0 items-end gap-3 px-4 pt-5 pb-6 md:px-5 md:pt-6 md:pb-8">
        <h2 className="text-sm font-medium">{title}</h2>
        {trailing ? <div className="ml-auto">{trailing}</div> : null}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden px-3 pb-3 md:px-5">
        {children}
        <div
          aria-hidden="true"
          className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent"
        />
      </div>
    </div>
  );
}

function FeedScene() {
  return (
    <StageShell
      title="Feed"
      trailing={
        <div className="bg-secondary inline-flex items-center gap-0.5 rounded-lg p-0.5">
          {["All", "Questions", "Projects", "Posts"].map((label, i) => (
            <span
              key={label}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          ))}
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {POSTS.map((post) => (
          <StageCard key={post.author} post={post} />
        ))}
      </div>
    </StageShell>
  );
}

function ProjectsScene() {
  return (
    <StageShell
      title="Projects"
      trailing={
        <span className="text-muted-foreground text-xs tabular-nums">
          {PROJECTS.length} this week
        </span>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {PROJECTS.map((post) => (
          <StageCard key={post.author} post={post} />
        ))}
      </div>
    </StageShell>
  );
}

function LeaderboardScene() {
  const podium = LEADERS.slice(0, 3);
  const rest = LEADERS.slice(3);
  const lead = LEADERS[0]?.reputation ?? 0;

  return (
    <StageShell
      title="Leaderboard"
      trailing={
        <span className="text-muted-foreground text-xs">This week</span>
      }
    >
      {/* Same stand as the real board — 2nd / 1st / 3rd, first tallest.
          pointer-events-none: this panel is a picture, not a people index. */}
      <div className="pointer-events-none">
        <LeaderboardPodium entries={podium} linked={false} />
        <ul className="mt-1 flex flex-col gap-0.5">
          {rest.map((entry) => (
            <LeaderboardRow
              key={entry.handle}
              entry={entry}
              leadReputation={lead}
              linked={false}
            />
          ))}
        </ul>
      </div>
    </StageShell>
  );
}

function JobsScene() {
  return (
    <StageShell
      title="Jobs"
      trailing={
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <CaseMinimalisticIcon size={13} />
          Matched by tags
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        {JOBS.map((job) => (
          <article
            key={job.title}
            className={cn(
              "bg-muted/60 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px]",
              job.match && "ring-brand/30",
            )}
          >
            <div className="bg-surface-primary ring-border-surface-strong rounded-xl p-4 ring-[0.5px]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold tracking-tight">
                    {job.title}
                  </h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {job.company} · {job.location}
                  </p>
                </div>
                {job.match ? (
                  <span className="bg-brand/10 text-brand-content ring-brand/20 flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-[0.5px]">
                    <MedalRibbonStarIcon size={11} />
                    {job.match}
                  </span>
                ) : null}
              </div>
              <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
                <span className="flex items-center gap-1 tabular-nums">
                  <BanknoteIcon size={12} />
                  {job.pay}
                </span>
                <span className="flex items-center gap-1">
                  <MapPointIcon size={12} />
                  {job.arrangement}
                </span>
                <span className="flex items-center gap-1">
                  <ClockCircleIcon size={12} />
                  {job.kind}
                </span>
                <span className="ml-auto">{job.time}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={job.match?.includes(tag) ? "brand" : "outline"}
                    className="text-[10px]"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </StageShell>
  );
}

export const STAGE_SCENES = [
  { id: "feed", node: <FeedScene /> },
  { id: "projects", node: <ProjectsScene /> },
  { id: "leaderboard", node: <LeaderboardScene /> },
  { id: "jobs", node: <JobsScene /> },
] as const;
