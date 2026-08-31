"use client";

import { useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { DangerTriangleIcon, RefreshIcon } from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { controlBase, controlGaps, controlSizes } from "@/components/ui/control";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/*
 * Fires only when the root layout itself throws, so unlike error.tsx it must
 * render its own <html>/<body> — there is no parent layout left standing.
 * Kept deliberately minimal (no Providers/IconProvider) since those are
 * exactly what may have failed.
 */
export default function GlobalError({
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="app-backdrop flex min-h-dvh flex-col items-center justify-center px-6 py-16">
          <span className="absolute top-6 left-6 flex items-center gap-2">
            <span className="text-lg leading-none font-semibold tracking-[-0.02em]">
              Chelaa
            </span>
          </span>

          <div className="bg-background/70 ring-border-surface-strong w-full max-w-md rounded-2xl p-8 text-center ring-[0.5px] supports-[backdrop-filter:blur(1px)]:backdrop-blur-xl">
            <div className="bg-destructive/10 text-destructive mx-auto grid size-14 place-items-center rounded-2xl">
              <DangerTriangleIcon size={28} />
            </div>

            <div className="text-muted-foreground mt-6 font-mono text-sm tracking-widest">
              ERROR
            </div>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              This page couldn&rsquo;t load
            </h1>

            <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm">
              A server error occurred. Reload to try again.
            </p>

            <div className="mt-7 flex items-center justify-center">
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
                Reload
              </button>
            </div>
          </div>

          <p className="text-muted-foreground/70 mt-6 text-xs">
            {error.digest ? `Error ${error.digest} · ` : ""}Chelaa
          </p>
        </div>
      </body>
    </html>
  );
}
