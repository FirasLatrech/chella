"use client";

import Link from "next/link";
import { Dialog, DialogPanel, DialogBackdrop } from "@headlessui/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  HamburgerMenuIcon,
  CloseCircleIcon,
  AltArrowRightIcon,
} from "@solar-icons/react/bold-duotone";
import { Sidebar } from "./sidebar";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useMe, useProfile } from "@/lib/queries";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * Mobile navigation: the sidebar becomes an off-canvas drawer under `md`.
 *
 * The nav itself is the same Sidebar component — one definition, not a
 * parallel mobile copy that drifts. The drawer adds what the desktop layout
 * gets from the header instead: identity, reputation, and the theme toggle
 * that's hidden on small screens.
 */
export function MobileNav() {
  const pathname = usePathname();
  // Closing on navigation is derived, not an effect: we remember which route
  // the drawer was opened on, and it is open only while we're still there.
  // (Setting state inside an effect triggers cascading renders.)
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  const { data: me } = useMe();
  const { data: profile } = useProfile(me?.handle);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className={cn(
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          "-ml-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors md:hidden",
        )}
      >
        <HamburgerMenuIcon size={18} />
      </button>

      <Dialog open={open} onClose={setOpen} className="relative z-50 md:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/40 backdrop-blur-sm duration-200 ease-out data-closed:opacity-0"
        />
        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className={cn(
              "app-backdrop relative flex w-[17.5rem] max-w-[85vw] flex-col",
              // Slides in from the left; only transform and opacity animate.
              "duration-200 ease-out data-closed:-translate-x-full data-closed:opacity-0",
            )}
          >
            <div className="flex min-h-0 flex-1 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
              {/* Close sits over the nav's own header row, so the drawer
                  doesn't grow a second title bar. */}
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className={cn(
                  "text-muted-foreground hover:text-foreground hover:bg-foreground/10",
                  "absolute top-[calc(env(safe-area-inset-top)+0.85rem)] right-3 z-10",
                  "grid size-8 cursor-pointer place-items-center rounded-lg transition-colors",
                )}
              >
                <CloseCircleIcon size={18} />
              </button>

              {/* Nav scrolls; the identity card below stays put. */}
              <div className="scroll-slim flex min-h-0 flex-1 flex-col overflow-y-auto">
                <Sidebar variant="drawer" />
              </div>

              {/* Identity — the drawer's equivalent of the desktop header. */}
              {me ? (
                <div className="shrink-0 px-3 pt-2 pb-3">
                  <div className="bg-background/70 ring-border-surface-strong rounded-xl p-1.5 ring-[0.5px] backdrop-blur-md">
                    <Link
                      href={`/people/${me.handle}`}
                      className="hover:bg-accent/60 flex items-center gap-2.5 rounded-lg p-1.5 transition-colors"
                    >
                      <Avatar
                        seed={me.handle}
                        src={profile?.avatar || undefined}
                        size="md"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {me.name}
                        </span>
                        <span className="text-muted-foreground block truncate text-[11px]">
                          {profile
                            ? `${formatPoints(profile.reputation)} XP`
                            : `@${me.handle}`}
                        </span>
                      </span>
                      <AltArrowRightIcon
                        size={14}
                        className="text-muted-foreground/70 shrink-0"
                      />
                    </Link>
                    <div className="border-border-surface mt-1.5 flex items-center justify-between border-t-[0.5px] px-1.5 pt-2">
                      <span className="text-muted-foreground text-[11px]">
                        Appearance
                      </span>
                      <ThemeToggle />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
