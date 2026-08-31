"use client";

import { useEffect } from "react";
import Link from "next/link";
import { DangerTriangleIcon, ArrowLeftIcon, RefreshIcon } from "@solar-icons/react/bold-duotone";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  controlBase,
  controlGaps,
  controlSizes,
} from "@/components/ui/control";

/*
 * Same frame as not-found.tsx — full-bleed sky backdrop with a single
 * floating card — so a crash still reads as Chelaa, not a bare Next.js
 * error screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="app-backdrop flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <Link
        href="/"
        data-logo-hover
        className="group/logo absolute top-6 left-6 flex items-center gap-2"
      >
        <span className="relative shrink-0">
          <span
            aria-hidden="true"
            className="bg-brand/40 pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full opacity-0 blur-lg transition-opacity duration-300 group-hover/logo:opacity-100"
          />
          <Logo className="logo-mark text-foreground h-6 w-auto" />
        </span>
        <span className="text-lg leading-none font-semibold tracking-[-0.02em]">
          Chelaa
        </span>
      </Link>

      <div className="bg-background/70 ring-border-surface-strong w-full max-w-md rounded-2xl p-8 text-center ring-[0.5px] supports-[backdrop-filter:blur(1px)]:backdrop-blur-xl">
        <div className="bg-destructive/10 text-destructive mx-auto grid size-14 place-items-center rounded-2xl">
          <DangerTriangleIcon size={28} />
        </div>

        <div className="text-muted-foreground mt-6 font-mono text-sm tracking-widest">
          ERROR
        </div>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>

        <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm">
          This page hit an unexpected error. You can try again, or head back
          to the feed.
        </p>

        <div className="mt-7 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className={cn(
              controlBase,
              "cursor-pointer justify-center font-[450] select-none",
              "bg-primary text-primary-foreground hover:bg-primary/80",
              "rounded-full transition-all duration-150 active:scale-95",
              controlGaps.md,
              controlSizes.md,
            )}
          >
            <RefreshIcon size={16} />
            Try again
          </button>

          {/* A styled Link rather than <Button as={Link}> — Button is a
              client component, and a function prop can't cross the server
              boundary here either. */}
          <Link
            href="/"
            className={cn(
              controlBase,
              "cursor-pointer justify-center font-[450] select-none",
              "border-border bg-background hover:bg-accent hover:text-accent-foreground border",
              "rounded-full transition-all duration-150 active:scale-95",
              controlGaps.md,
              controlSizes.md,
            )}
          >
            <ArrowLeftIcon size={16} />
            Back to feed
          </Link>
        </div>
      </div>

      <p className="text-muted-foreground/70 mt-6 text-xs">
        {error.digest ? `Error ${error.digest} · ` : ""}Chelaa
      </p>
    </div>
  );
}
