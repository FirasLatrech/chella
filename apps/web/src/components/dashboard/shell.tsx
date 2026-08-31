import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";

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
      {/* Under `md` the sidebar lives in the drawer (see MobileNav in the
          page header) — the content panel takes the full width instead. */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      {/* Hairline edge: a 0.5px ring renders sub-pixel on retina, so the panel
          reads as a crisp seam against the glass rather than a drawn border. */}
      <main className="bg-background ring-border-surface-strong flex min-w-0 flex-1 flex-col overflow-hidden ring-[0.5px] md:rounded-l-2xl">
        {children}
      </main>
      {/* Mounted once for the whole app, so any control can open the profile
          editor in place instead of navigating to /people/[handle]?edit=1. */}
      <EditProfileDialog />
    </div>
  );
}
