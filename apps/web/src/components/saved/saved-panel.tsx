"use client";

import { useRef } from "react";
import { SavedList } from "./saved-list";

/** Owns the scroll layer the virtualizer measures against. */
export function SavedPanel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <div className="w-full px-3 pb-16 md:px-5">
        <main className="mt-1 min-w-0">
          <SavedList scrollRef={scrollRef} />
        </main>
      </div>
    </div>
  );
}
