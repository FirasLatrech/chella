"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
import { Composer } from "./composer";
import { FeedList } from "./feed-list";
import { invalidateEntryLists } from "@/lib/cache";
import { createPost, ApiError } from "@/lib/mutations";
import type { ComposerDraft } from "@/lib/draft";

export type { ComposerDraft } from "@/lib/draft";

/*
 * Feed layout + data. Entries come from the React Query cache (hydrated by
 * the server); publishing POSTs to the API and invalidates the cache, so the
 * new entry arrives from the source of truth rather than an optimistic copy.
 */
export function FeedSection({ rail }: { rail?: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const rootRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  // The panel's scroll layer — the virtualizer measures against it rather
  // than introducing a nested scroller.
  const scrollRef = useRef<HTMLDivElement>(null);

  // The tabs stick directly below the composer, whose height changes when it
  // expands — publish the measured height as a CSS variable so their offset
  // tracks it without hardcoding.
  useEffect(() => {
    const root = rootRef.current;
    const band = bandRef.current;
    if (!root || !band) return;
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--composer-h", `${band.offsetHeight}px`);
    });
    observer.observe(band);
    return () => observer.disconnect();
  }, []);

  async function publish(draft: ComposerDraft) {
    try {
      await createPost(draft);
      // Central helper: feed, infinite pages, saved, "for you" and the tab
      // counts all move when a post is published.
      await invalidateEntryLists(queryClient);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Their writing is already autosaved (lib/draft.ts); the composer
        // flags the round-trip so it reopens expanded on return.
        router.push("/login?next=%2F");
        return false;
      }
      throw err;
    }
    return true;
  }

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col">
      {/* Single full-height scroll layer, so the scrollbar track starts at
          the very top of the panel. */}
      <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        {/* Composer — sticky: it never leaves the screen, and feed rows slide
            beneath it while scrolling.

            OPAQUE, not frosted. It was `bg-background/90` + backdrop-blur, and
            cards passing underneath ghosted through as smudges. The band sits
            on the content panel — itself `bg-background` — so an opaque fill is
            the same colour and simply hides what passes below. It also drops a
            full-width backdrop-filter that the compositor was re-running on
            every scrolled frame. (Translucency in this app is for surfaces over
            the sky backdrop, not over the content panel.) */}
        <div
          ref={bandRef}
          className="bg-background sticky top-0 z-30 flex w-full gap-4 px-3 md:gap-6 pt-4 pb-3 md:px-5 md:pt-5"
        >
          <div className="min-w-0 flex-1">
            <Composer onPublish={publish} />
          </div>
        </div>

        <div className="flex w-full gap-4 px-3 md:gap-6 pb-10 md:px-5">
          <main className="@container min-w-0 flex-1">
            <FeedList scrollRef={scrollRef} rail={rail} />
          </main>
        </div>
      </div>
    </div>
  );
}
