"use client";

import Link from "next/link";
import {
  CheckCircleIcon,
  UserCircleIcon,
  PenNewSquareIcon,
  ChatRoundDotsIcon,
  ArrowUpIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { useMe, useProfile } from "@/lib/queries";
import { openEditProfile } from "@/lib/edit-profile";
import { HoverPopover } from "@/components/ui/hover-popover";

const SIZE = 18;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/*
 * Ring trigger — a minimal, incomplete progress circle that fills a segment
 * per finished step. Sits in the header instead of a permanent checklist
 * panel; the full detail lives in the hover popover below.
 */
function ProgressRing({ fraction }: { fraction: number }) {
  const offset = CIRCUMFERENCE * (1 - fraction);
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="-rotate-90"
      aria-hidden="true"
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE}
        className="stroke-muted"
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        className="stroke-brand transition-[stroke-dashoffset] duration-500 ease-out"
      />
    </svg>
  );
}

/*
 * A checklist row. Most steps navigate somewhere; the profile step instead
 * opens the editor in place, so it renders as a button — a link that doesn't
 * go anywhere would lie to the browser (and to middle-click).
 */
function StepRow({
  href,
  onClick,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(className, "w-full cursor-pointer text-left")}
    >
      {children}
    </button>
  );
}

/*
 * "Getting started" onboarding, folded into a header icon.
 *
 * Every step reflects real account state, so it can't congratulate someone
 * for work they haven't done, and the ring disappears on its own once the
 * last step is met. The first step matters most: posting is gated behind a
 * filled-in profile, and the popover is what explains that to a new user.
 */
export function Onboarding() {
  const { data: me } = useMe();
  const { data: profile } = useProfile(me?.handle);

  if (!me || !profile) return null;

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
      // Opens the editor over the feed — no detour to the profile page.
      action: openEditProfile,
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
      // Questions live in the feed now, behind its Questions tab.
      href: "/",
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
  // Nothing left to guide — drop the ring from the header entirely.
  if (doneCount === steps.length) return null;

  const next = steps.find((s) => !s.done)!;

  return (
    <HoverPopover
      align="end"
      trigger={
        <button
          type="button"
          aria-label={`Getting started: ${doneCount} of ${steps.length} done`}
          className="hover:bg-accent grid size-7 shrink-0 cursor-pointer place-items-center rounded-full transition-colors"
        >
          <ProgressRing fraction={doneCount / steps.length} />
        </button>
      }
      className="w-80"
    >
      <div className="px-2 pt-1.5 pb-1">
        <h2 className="text-sm font-semibold tracking-tight">
          Getting started on Chelaa
        </h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {doneCount} of {steps.length} done — next: {next.label.toLowerCase()}.
        </p>
      </div>

      <ul className="flex flex-col gap-1 p-0.5">
        {steps.map((step) => {
          const Icon = step.done ? CheckCircleIcon : step.icon;
          const isNext = step.key === next.key;
          // A step either navigates (href) or runs an action in place — the
          // profile step opens the editor rather than leaving the page.
          const action = "action" in step ? step.action : undefined;
          return (
            <li key={step.key}>
              <StepRow
                href={"href" in step ? step.href : undefined}
                onClick={action}
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
              </StepRow>
            </li>
          );
        })}
      </ul>
    </HoverPopover>
  );
}
