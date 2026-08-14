"use client";

import { TabGroup } from "@headlessui/react";
import { useMemo, useState } from "react";
import { CaseMinimalisticIcon } from "@solar-icons/react/bold-duotone";
import { Tabs, TabItem } from "@/components/ui/tabs";
import { JobCard } from "./job-card";
import { useJobs, type Job } from "@/lib/queries";

const FILTERS = [
  { label: "All roles", match: () => true },
  {
    label: "Matches you",
    match: (j: Job) => j.matchedTags.length > 0,
  },
  { label: "Remote", match: (j: Job) => j.arrangement === "remote" },
  {
    label: "Entry level",
    match: (j: Job) => j.minReputation === 0 || j.kind === "internship",
  },
] as const;

/*
 * The board. Roles arrive already ordered by the API — anything overlapping
 * the tags you contribute in comes first — so "Matches you" is a filter over
 * that signal rather than a separate ranking.
 */
export function JobsBrowser() {
  const { data: jobs = [] } = useJobs();
  const [filter, setFilter] = useState(0);

  const counts = useMemo(
    () => FILTERS.map((f) => jobs.filter(f.match).length),
    [jobs],
  );
  const visible = useMemo(
    () => jobs.filter(FILTERS[filter].match),
    [jobs, filter],
  );
  const matchCount = counts[1];

  return (
    <TabGroup selectedIndex={filter} onChange={setFilter}>
      {matchCount > 0 ? (
        <p className="text-muted-foreground mb-3 text-xs">
          {matchCount === 1 ? "1 role matches" : `${matchCount} roles match`}{" "}
          the tags you contribute in.
        </p>
      ) : null}

      <div className="mb-3">
        <Tabs>
          {FILTERS.map((f, i) => (
            <TabItem key={f.label} count={counts[i]}>
              {f.label}
            </TabItem>
          ))}
        </Tabs>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-3 py-16 text-center">
          <div className="bg-brand/10 text-brand-content grid size-12 place-items-center rounded-2xl">
            <CaseMinimalisticIcon size={22} />
          </div>
          <div>
            <p className="text-sm font-medium">No roles here yet</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {filter === 1
                ? "Answer questions and ship projects — matches follow your tags."
                : "Try another filter."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </TabGroup>
  );
}
