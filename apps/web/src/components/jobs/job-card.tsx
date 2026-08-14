"use client";

import {
  BanknoteIcon,
  MapPointIcon,
  ClockCircleIcon,
  MedalRibbonStarIcon,
} from "@solar-icons/react/bold-duotone";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/queries";

const ARRANGEMENT: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

const KIND: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
};

function salary(job: Job) {
  if (!job.salaryMin && !job.salaryMax) return null;
  const fmt = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));
  if (job.salaryMin && job.salaryMax) {
    return `${fmt(job.salaryMin)}–${fmt(job.salaryMax)} ${job.currency}`;
  }
  return `${fmt(job.salaryMin || job.salaryMax || 0)} ${job.currency}`;
}

/*
 * A listing. When the reader's contributions overlap the role's skills, the
 * card leads with the rank they hold on those tags — the concrete link from
 * answering questions to being findable for work.
 */
export function JobCard({ job }: { job: Job }) {
  const pay = salary(job);
  const matched = job.matchedTags;

  return (
    <article
      className={cn(
        "bg-muted/60 ring-border-surface-strong rounded-2xl p-1.5 ring-[0.5px]",
        matched.length > 0 && "ring-brand/30",
      )}
    >
      <div className="bg-surface-primary ring-border-surface-strong rounded-xl p-4 ring-[0.5px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold tracking-tight text-balance">
              {job.title}
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
            </p>
          </div>
          {matched.length > 0 ? (
            <span className="bg-brand/10 text-brand-content ring-brand/20 flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-[0.5px]">
              <MedalRibbonStarIcon size={11} />
              {matched.map((m) => `#${m.rank} ${m.tag}`).join(" · ")}
            </span>
          ) : null}
        </div>

        <p className="text-muted-foreground mt-2.5 line-clamp-2 text-xs leading-relaxed text-pretty">
          {job.description}
        </p>

        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
          {pay ? (
            <span className="flex items-center gap-1 tabular-nums">
              <BanknoteIcon size={12} />
              {pay}
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <MapPointIcon size={12} />
            {ARRANGEMENT[job.arrangement] ?? job.arrangement}
          </span>
          <span className="flex items-center gap-1">
            <ClockCircleIcon size={12} />
            {KIND[job.kind] ?? job.kind}
          </span>
          <span className="ml-auto">{job.time}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {job.tags.map((tag) => {
            const isMatch = matched.some(
              (m) => m.tag.toLowerCase() === tag.toLowerCase(),
            );
            return (
              <Badge
                key={tag}
                variant={isMatch ? "brand" : "outline"}
                className="text-[10px]"
              >
                {tag}
              </Badge>
            );
          })}

          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "ml-auto rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            )}
          >
            View role
          </a>
        </div>

        {/* Reputation is a signal, never a gate — the role still lists. */}
        {job.minReputation > 0 && matched.length > 0 && !job.qualified ? (
          <p className="text-muted-foreground/80 mt-2.5 text-[11px]">
            Usually goes to contributors around {job.minReputation} reputation
            — keep answering in {matched[0].tag} and this comes into range.
          </p>
        ) : null}
      </div>
    </article>
  );
}
