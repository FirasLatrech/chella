"use client";

import Link from "next/link";
import { BoltIcon } from "@solar-icons/react/bold-duotone";
import { useMe, useProfile } from "@/lib/queries";
import { formatPoints } from "@/lib/format";

/*
 * Header XP pill — the signed-in user's total reputation, always in view.
 * Polls with the profile query so points earned elsewhere tick in live.
 */
export function XpChip() {
  const { data: me } = useMe();
  const { data: profile } = useProfile(me?.handle);

  if (!me || !profile) return null;

  return (
    <Link
      href={`/people/${me.handle}`}
      className="bg-brand/10 text-brand-content ring-border-surface-strong hover:bg-brand/15 flex h-7 items-center gap-1 rounded-full px-2.5 ring-[0.5px] transition-colors"
      title={`${profile.reputation.toLocaleString()} XP`}
    >
      <BoltIcon size={13} />
      <span className="text-xs font-medium tabular-nums">
        {formatPoints(profile.reputation)} XP
      </span>
    </Link>
  );
}
