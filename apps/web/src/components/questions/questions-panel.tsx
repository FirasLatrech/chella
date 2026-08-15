"use client";

import { useRef } from "react";
import { QuestionsList } from "./questions-list";

/*
 * Owns the scroll layer so the virtualizer has a real element to measure
 * against — the server page can't hold a ref, and a nested scroller would
 * give the page two scrollbars.
 */
export function QuestionsPanel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <div className="flex w-full gap-4 px-3 md:gap-6 pb-10 md:px-5">
        <main className="min-w-0 flex-1 pt-1">
          <QuestionsList scrollRef={scrollRef} />
        </main>
        <div className="hidden w-72 shrink-0 xl:block" />
      </div>
    </div>
  );
}
