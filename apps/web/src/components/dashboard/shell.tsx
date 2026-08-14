import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

/*
 * App shell: the sky backdrop carries the page, the sidebar sits directly on
 * it (translucent, so the sky shows through), and the main content is an
 * inset panel — the same frame-inside-tint relationship the cards use, at
 * page scale.
 */
export function Shell({ children }: { children: ReactNode }) {
  // The shell fills the viewport edge to edge — no outer padding. Only the
  // content panel is rounded, and only on its left corners, so it reads as a
  // surface sliding out from under the sidebar.
  return (
    <div className="app-backdrop flex h-dvh w-full overflow-hidden">
      <Sidebar />
      {/* Hairline edge: a 0.5px ring renders sub-pixel on retina, so the panel
          reads as a crisp seam against the glass rather than a drawn border. */}
      <main className="bg-background ring-border-surface-strong flex min-w-0 flex-1 flex-col overflow-hidden rounded-l-2xl ring-[0.5px]">
        {children}
      </main>
    </div>
  );
}
