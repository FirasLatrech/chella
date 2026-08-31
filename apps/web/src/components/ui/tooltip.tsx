"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Small hover/focus label for an icon-only control.
 *
 * Same construction as HoverPopover and the dropdown panels: CSS `absolute`
 * inside a `relative` wrapper — never Headless UI's `anchor` prop, which
 * portals to the body and measures on open, causing a visible scroll jump.
 *
 * The surface matches the contributions-graph tooltip already in the app
 * (popover background, hairline ring, soft shadow) so labels look the same
 * everywhere. `pointer-events-none` keeps it from ever swallowing the click
 * it is describing.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // A short delay on close only — showing is instant, but a tooltip that
  // vanishes the instant the pointer twitches reads as flicker.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  }

  function hide() {
    timer.current = setTimeout(() => setOpen(false), 80);
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <span
        role="tooltip"
        aria-hidden={!open}
        className={cn(
          "bg-popover text-popover-foreground ring-border-surface-strong pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-lg px-2 py-1 ring-[0.5px]",
          "text-[11px] font-medium whitespace-nowrap shadow-lg shadow-black/15",
          // Fade + a small rise, rather than appearing instantly.
          "transition-[opacity,transform] duration-150 ease-out",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          open
            ? "translate-y-0 opacity-100"
            : cn(
                "opacity-0",
                side === "top" ? "translate-y-0.5" : "-translate-y-0.5",
              ),
          className,
        )}
      >
        {label}
      </span>
    </span>
  );
}
