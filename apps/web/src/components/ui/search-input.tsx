"use client";

import { MagnifierIcon, CloseCircleIcon } from "@solar-icons/react/bold-duotone";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  controlDisabled,
  controlRadius,
  controlSizes,
  type ControlSize,
} from "./control";

/*
 * Search field with some life in it:
 * - the magnifier tints brand while focused
 * - a `/` keycap hints the global shortcut, swapping for a clear button
 *   once there's a query
 * - pressing `/` anywhere on the page focuses it (unless you're typing
 *   somewhere else)
 *
 * Padding is set explicitly at every breakpoint — the generic control sizes
 * reassert px-* at `md:`, which is exactly how an icon ends up overlapping
 * the placeholder.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  size = "sm",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: ControlSize;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      ref.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <MagnifierIcon
        size={15}
        className={cn(
          "pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 transition-colors duration-200",
          focused ? "text-brand" : "text-muted-foreground",
        )}
      />

      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            ref.current?.blur();
          }
        }}
        placeholder={placeholder}
        className={cn(
          "border-input bg-background placeholder:text-muted-foreground w-full border bg-clip-padding outline-none",
          "transition-all duration-200",
          // Literal focus: classes — Tailwind's static scan can't see
          // runtime-transformed strings, so mirroring controlFocus by hand.
          "focus:ring-ring/50 focus:border-ring focus:ring-3",
          controlDisabled,
          controlSizes[size],
          controlRadius,
          // Explicit at every breakpoint — see note above.
          "pl-9 pr-8 md:pl-9 md:pr-8",
        )}
      />

      <div className="absolute top-1/2 right-2 -translate-y-1/2">
        <AnimatePresence initial={false} mode="wait">
          {value ? (
            <motion.button
              key="clear"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.12 }}
              onClick={() => {
                onChange("");
                ref.current?.focus();
              }}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground flex cursor-pointer transition-colors"
            >
              <CloseCircleIcon size={15} />
            </motion.button>
          ) : !focused ? (
            <motion.kbd
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="bg-secondary text-muted-foreground ring-border-surface grid size-5 place-items-center rounded-md font-mono text-[10px] ring-[0.5px]"
            >
              /
            </motion.kbd>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
