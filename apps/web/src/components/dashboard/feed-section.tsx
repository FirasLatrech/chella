"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
import { Composer } from "./composer";
import { FeedList } from "./feed-list";
import { queryKeys } from "@/lib/queries";
import { createPost, ApiError } from "@/lib/mutations";
import type { FeedKind } from "./feed-item";
import type { Block } from "@/lib/content";

export interface ComposerDraft {
  kind: FeedKind;
  title: string;
  /** Plain text — drafts and the excerpt fallback. */
  body: string;
  /** Structured body; what actually gets stored. */
  blocks?: Block[];
  tags: string[];
  imageUrl?: string;
}

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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.feed }),
        queryClient.invalidateQueries({ queryKey: ["infinite"] }),
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Don't lose their writing to the login round-trip; the composer
        // restores this on remount. (Attached files can't be serialised.)
        try {
          sessionStorage.setItem("chelaa:draft", JSON.stringify(draft));
        } catch {}
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
        {/* Composer — sticky, frosted: it never leaves the screen, and feed
            rows slide beneath it while scrolling. */}
        <div
          ref={bandRef}
          className="bg-background/90 sticky top-0 z-30 flex w-full gap-4 px-3 md:gap-6 pt-4 pb-3 md:px-5 md:pt-5 backdrop-blur-md"
        >
          <div className="min-w-0 flex-1">
            <Composer onPublish={publish} />
          </div>
          <div className="hidden w-72 shrink-0 xl:block" />
        </div>

        <div className="flex w-full gap-4 px-3 md:gap-6 pb-10 md:px-5">
          <main className="min-w-0 flex-1">
            <FeedList scrollRef={scrollRef} />
          </main>
          <div className="hidden w-72 shrink-0 xl:block" />
        </div>
      </div>

      {/* Rail — pinned to the panel itself, above the scroll layer. */}
      <div className="scroll-slim absolute top-5 right-5 bottom-0 z-40 hidden w-72 overflow-y-auto pb-6 xl:block">
        {rail}
      </div>
    </div>
  );
}
