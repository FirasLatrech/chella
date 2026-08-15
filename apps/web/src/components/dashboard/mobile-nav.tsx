"use client";

import { Dialog, DialogPanel, DialogBackdrop } from "@headlessui/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HamburgerMenuIcon } from "@solar-icons/react/bold-duotone";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

/*
 * Mobile navigation: the sidebar becomes an off-canvas drawer under `md`.
 *
 * The same Sidebar renders inside — one nav definition, not a parallel mobile
 * copy that drifts. The drawer closes on navigation, since tapping a
 * destination and being left staring at the menu is the classic mistake here.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change. Keyed on pathname rather than the click, so it
  // also closes when navigation comes from inside the panel.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
              "app-backdrop relative flex w-[17rem] max-w-[85vw] flex-col",
              // Slides in from the left; only transform and opacity animate.
              "duration-200 ease-out data-closed:-translate-x-full data-closed:opacity-0",
            )}
          >
            {/* Respect the notch/home indicator on phones. */}
            <div className="flex min-h-0 flex-1 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
              <Sidebar variant="drawer" />
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
