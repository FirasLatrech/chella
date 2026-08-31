import Link from "next/link";
import {
  AltArrowRightIcon,
  DocumentTextIcon,
  ArrowUpIcon,
  EyeIcon,
  LetterIcon,
} from "@solar-icons/react/bold-duotone";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeShelf, type ProfileBadge } from "@/components/profile/badge-shelf";
import { formatPoints } from "@/lib/format";

const CONTACT = "sponsor@chelaa.tech";

const BADGES: ProfileBadge[] = [
  {
    slug: "tag-leader",
    label: "#1 Go",
    description: "First on the Go board",
    tier: "gold",
  },
  {
    slug: "builder",
    label: "Builder",
    description: "Shipped projects in public",
    tier: "gold",
    count: 3,
  },
  {
    slug: "problem-solver",
    label: "Problem solver",
    description: "Accepted answers",
    tier: "silver",
    count: 11,
  },
  {
    slug: "helper",
    label: "Helper",
    description: "Replies that landed",
    tier: "bronze",
    count: 24,
  },
];

const STATS = [
  { icon: DocumentTextIcon, value: 56, label: "Contributions" },
  { icon: ArrowUpIcon, value: 842, label: "Votes earned" },
  { icon: EyeIcon, value: 12400, label: "Views" },
];

export function LandingClose() {
  return (
    <section className="px-5 pt-16 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:px-10 lg:px-16 lg:pt-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide">
            <span className="tabular-nums">05</span>
            <span aria-hidden="true"> · </span>
            The name
          </p>
          <h2 className="mt-3 max-w-[16ch] text-[2.1rem] leading-[1.12] font-semibold tracking-tight text-balance sm:text-4xl">
            What you ship is what people{" "}
            <span className="text-brand-content">see.</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-[42ch] text-sm leading-relaxed text-pretty sm:text-base">
            A Chelaa profile is contributions, badges and a board rank — derived
            from the feed, never from a PDF.
          </p>
          <p className="text-muted-foreground/80 mt-5 font-mono text-[11px] tracking-wide">
            post +5 · project +10 · answer +5 · accepted +20 · upvote +3
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Button
              as={Link}
              href="/login?signup=1"
              variant="brand"
              size="lg"
              shape="pill"
            >
              Join Chelaa
              <AltArrowRightIcon size={16} />
            </Button>
            <Button
              as="a"
              href={`mailto:${CONTACT}`}
              variant="ghost"
              size="lg"
              shape="pill"
            >
              <LetterIcon size={16} />
              Hiring
            </Button>
          </div>
        </div>

        <div aria-hidden="true" className="min-w-0">
          <div className="bg-muted/70 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px]">
            <div className="bg-background ring-border-surface-strong overflow-hidden rounded-xl ring-[0.5px]">
              <div className="flex items-center gap-4 p-5">
                <Avatar seed="ahmed" size="xl" className="size-14" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold tracking-tight">
                    Ahmed
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    @ahmed
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="brand" className="text-[10px]">
                      #1 Go
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      Next.js
                    </Badge>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-brand-content text-lg font-semibold tabular-nums">
                    #1
                  </p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {formatPoints(8420)} rep
                  </p>
                </div>
              </div>
              <p className="text-foreground/80 px-5 pb-5 text-sm text-pretty">
                One binary. Open data for Tunisia. The feed is the CV.
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-muted/70 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px]"
                >
                  <div className="bg-background ring-border-surface-strong rounded-xl p-3 ring-[0.5px]">
                    <Icon size={14} className="text-brand-content" />
                    <p className="mt-2 text-sm font-semibold tabular-nums">
                      {formatPoints(stat.value)}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                      {stat.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <BadgeShelf badges={BADGES} />
          </div>
        </div>
      </div>

      <p className="text-muted-foreground/70 mx-auto mt-16 max-w-6xl text-xs">
        Chelaa · Free for the people who contribute to it.
        <span aria-hidden="true"> · </span>
        <a href={`mailto:${CONTACT}`} className="hover:text-foreground">
          {CONTACT}
        </a>
      </p>
    </section>
  );
}
