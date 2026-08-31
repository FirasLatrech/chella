"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Hover-triggered popover for a compact icon trigger.
 *
 * Headless UI's Popover is click-controlled; this is a small hover variant
 * built the same way dropdown panels in this app already work — CSS
 * (`absolute`) positioning inside a `relative` wrapper, not the `anchor`
 * prop, so there's no portal-measure scroll jump. A short close delay lets
 * the pointer travel from trigger to panel without it vanishing.
 */
export function HoverPopover({
  trigger,
  children,
  align = "end",
  className,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function hide() {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {trigger}

      <div
        role="dialog"
        aria-hidden={!open}
        className={cn(
          "bg-popover text-popover-foreground absolute top-full z-50 mt-2 w-80 origin-top rounded-2xl p-1.5",
          "ring-[0.5px] ring-border-surface-strong shadow-lg shadow-black/10",
          "transition-all duration-150 ease-out",
          align === "end" ? "right-0" : "left-0",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
