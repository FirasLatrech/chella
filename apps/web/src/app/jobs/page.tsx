import {
  CaseMinimalisticIcon,
  MapPointIcon,
  BanknoteIcon,
  ClockCircleIcon,
  SuitcaseIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Shell } from "@/components/dashboard/shell";
import { requireAuth } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

/*
 * Jobs is not live yet. Real-looking listings render blurred and inert
 * beneath a coming-soon panel — a preview of the shape of the feature, not
 * a fake version of it.
 */

const MOCK_JOBS = [
  {
    id: "j1",
    title: "Senior React Developer",
    company: "Fintech startup · Tunis",
    salary: "4.5–6k TND",
    type: "Full-time",
    tags: ["React", "TypeScript", "Next.js"],
  },
  {
    id: "j2",
    title: "Go Backend Engineer",
    company: "Logistics platform · Remote",
    salary: "5–7k TND",
    type: "Full-time",
    tags: ["Go", "Postgres", "Kubernetes"],
  },
  {
    id: "j3",
    title: "Machine Learning Engineer",
    company: "AI lab · Sousse",
    salary: "4–5.5k TND",
    type: "Hybrid",
    tags: ["Python", "PyTorch"],
  },
  {
    id: "j4",
    title: "DevOps Engineer",
    company: "SaaS scale-up · Sfax",
    salary: "4–6k TND",
    type: "Remote",
    tags: ["AWS", "Terraform"],
  },
  {
    id: "j5",
    title: "Product Designer",
    company: "Design studio · Tunis",
    salary: "3.5–5k TND",
    type: "Full-time",
    tags: ["Figma", "Design systems"],
  },
  {
    id: "j6",
    title: "Flutter Developer",
    company: "E-commerce app · Remote",
    salary: "3.5–5k TND",
    type: "Contract",
    tags: ["Flutter", "Dart"],
  },
];

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  await requireAuth("/jobs");

  return (
    <Shell>
      <PageHeader title="Jobs" />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* The preview — blurred and fully inert. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden blur-[6px] select-none"
        >
          <div className="grid w-full gap-3 px-5 pt-1 pb-10 sm:grid-cols-2 xl:grid-cols-3">
            {MOCK_JOBS.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>

        {/* Soft wash so the blur reads as intentional, not broken. */}
        <div className="from-background/30 via-background/60 to-background absolute inset-0 bg-gradient-to-b" />

        {/* Coming soon — frame-inside-tint, translucent so the blurred
            preview still reads through both layers. */}
        <div className="absolute inset-0 grid place-items-center px-6">
          <div
            className={cn(
              "bg-muted/50 ring-border-surface-strong w-full max-w-md rounded-2xl p-1.5 ring-[0.5px]",
              "supports-[backdrop-filter:blur(1px)]:backdrop-blur-xl",
            )}
          >
            <div className="bg-background/80 ring-border-surface-strong rounded-xl p-8 text-center ring-[0.5px]">
              <div className="bg-brand/10 text-brand mx-auto grid size-14 place-items-center rounded-2xl">
                <CaseMinimalisticIcon size={28} />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">
                Jobs are coming soon
              </h2>
              <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm leading-relaxed">
                Companies will discover you through your Chelaa reputation —
                answers, projects and contributions, not just a CV.
              </p>
              <p className="text-muted-foreground/70 mt-5 text-xs">
                Keep contributing — your profile is your application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function JobCard({ job }: { job: (typeof MOCK_JOBS)[number] }) {
  return (
    <div className="bg-muted/60 ring-border-surface-strong flex flex-col rounded-2xl p-1.5 ring-[0.5px]">
      {/* Inset body — frame-inside-tint, matching Card/ProjectCard. */}
      <div className="bg-surface-primary ring-border-surface-strong flex flex-col gap-3 rounded-xl p-4 ring-[0.5px]">
        <div className="flex items-start gap-3">
          <Avatar seed={job.company} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="line-clamp-1 text-sm leading-snug font-semibold tracking-tight">
                {job.title}
              </h2>
              <div className="bg-brand/10 text-brand-content grid size-7 shrink-0 place-items-center rounded-lg">
                <SuitcaseIcon size={14} />
              </div>
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {job.company}
            </p>
          </div>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1 tabular-nums">
            <BanknoteIcon size={13} />
            {job.salary}
          </span>
          <span className="flex items-center gap-1">
            <ClockCircleIcon size={13} />
            {job.type}
          </span>
          <span className="flex items-center gap-1">
            <MapPointIcon size={13} />
            Tunisia
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {job.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
