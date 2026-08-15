"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircleIcon,
  CloseCircleIcon,
  UserCircleIcon,
  PenNewSquareIcon,
  ChatRoundDotsIcon,
  ArrowUpIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { useMe, useProfile } from "@/lib/queries";

const DISMISS_KEY = "chelaa:onboarding-dismissed";

/*
 * First-run checklist.
 *
 * Every step reflects real account state, so it can't congratulate someone
 * for work they haven't done, and it disappears on its own once the last
 * step is met. The first step matters most: posting is gated behind a
 * filled-in profile, and without this a new user just hits a disabled
 * Publish button with no explanation.
 */
export function Onboarding() {
  const { data: me } = useMe();
  const { data: profile } = useProfile(me?.handle);

  // Read once on mount; a dismissal is per-browser and permanent.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!me || !profile || dismissed) return null;

  const hasProfile = Boolean(
    profile.bio ||
      profile.github ||
      profile.linkedin ||
      profile.website ||
      profile.cvUrl,
  );
  const hasPosted = profile.posts > 0;
  const hasAnswered = profile.answers > 0;
  const hasVoted = profile.reputation > 0 && (hasPosted || hasAnswered);

  const steps = [
    {
      key: "profile",
      done: hasProfile,
      icon: UserCircleIcon,
      label: "Complete your profile",
      body: "A bio, a link or your CV. Posting unlocks once there's something here.",
      href: `/people/${me.handle}`,
      cta: "Add details",
    },
    {
      key: "post",
      done: hasPosted,
      icon: PenNewSquareIcon,
      label: "Share your first post",
      body: "Ask a question or show a project. Posts earn +5, projects +10.",
      href: "/",
      cta: "Open the composer",
    },
    {
      key: "answer",
      done: hasAnswered,
      icon: ChatRoundDotsIcon,
      label: "Answer someone",
      body: "Answers earn +5, and an accepted one is +20 — the biggest single jump.",
      href: "/questions",
      cta: "Find a question",
    },
    {
      key: "vote",
      done: hasVoted,
      icon: ArrowUpIcon,
      label: "Earn your first reputation",
      body: "Contributions others find useful move you up the leaderboard.",
      href: "/leaderboard",
      cta: "See the board",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  // Nothing left to guide — stop occupying the top of the feed.
  if (doneCount === steps.length) return null;

  const next = steps.find((s) => !s.done)!;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  }

  return (
    <div className="bg-muted/60 ring-border-surface-strong relative mb-3 rounded-2xl p-1.5 ring-[0.5px]">
      <div className="bg-surface-primary ring-border-surface-strong rounded-xl p-4 ring-[0.5px]">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-tight">
              Getting started on Chelaa
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {doneCount} of {steps.length} done — next: {next.label.toLowerCase()}.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss getting started"
            onClick={dismiss}
            className="text-muted-foreground/70 hover:text-foreground hover:bg-accent -mt-1 -mr-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors"
          >
            <CloseCircleIcon size={16} />
          </button>
        </div>

        {/* Progress — compositor-only transition on width. */}
        <div className="bg-muted mt-3 h-1 overflow-hidden rounded-full">
          <div
            className="bg-brand h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>

        <ul className="mt-3 flex flex-col gap-1">
          {steps.map((step) => {
            const Icon = step.done ? CheckCircleIcon : step.icon;
            const isNext = step.key === next.key;
            return (
              <li key={step.key}>
                <Link
                  href={step.href}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors",
                    step.done
                      ? "opacity-60"
                      : isNext
                        ? "bg-brand/5 hover:bg-brand/10"
                        : "hover:bg-accent/60",
                  )}
                >
                  <Icon
                    size={16}
                    className={cn(
                      "mt-px shrink-0",
                      step.done
                        ? "text-emerald-600 dark:text-emerald-500"
                        : isNext
                          ? "text-brand-content"
                          : "text-muted-foreground",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-xs font-medium",
                        step.done && "line-through",
                      )}
                    >
                      {step.label}
                    </span>
                    {!step.done ? (
                      <span className="text-muted-foreground block text-[11px] leading-relaxed">
                        {step.body}
                      </span>
                    ) : null}
                  </span>
                  {isNext ? (
                    <span className="text-brand-content shrink-0 text-[11px] font-medium">
                      {step.cta}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
