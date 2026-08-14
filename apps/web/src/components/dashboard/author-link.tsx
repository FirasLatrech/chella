"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Wraps an avatar/handle so it navigates to the author's profile even when
 * nested inside a card that's itself a <Link> (e.g. a feed row linking to
 * the post). A real <a> can't nest inside another <a>, so this is a button
 * that pushes the route and stops the click from bubbling to the outer
 * link — same trick as VotePill.
 */
export function AuthorLink({
  handle,
  className,
  children,
}: {
  handle: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/people/${handle}`);
      }}
      className={cn(
        "cursor-pointer rounded-md outline-none transition-opacity hover:opacity-80",
        "focus-visible:ring-ring/50 focus-visible:ring-2",
        className,
      )}
    >
      {children}
    </button>
  );
}
