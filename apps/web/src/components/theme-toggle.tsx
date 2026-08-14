"use client";

import { useRef, useSyncExternalStore } from "react";
import { SunIcon, MoonIcon } from "@solar-icons/react/bold-duotone";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { switchTheme } from "@/lib/theme-transition";
import { useInteractionSound } from "@/lib/sound";

// The <html> class is the source of truth — it is set before first paint by the
// inline script in layout.tsx, so we subscribe to it rather than mirror it in
// component state (which would desync on hydration).
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ref = useRef<HTMLButtonElement>(null);
  const sound = useInteractionSound();

  function toggle() {
    // Reveal expands from the button itself, so the wipe feels anchored to
    // the control rather than arriving from nowhere.
    const rect = ref.current?.getBoundingClientRect();
    switchTheme(!dark, {
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    });
  }

  return (
    <Button
      ref={ref}
      iconOnly
      size="sm"
      variant="ghost"
      onClick={toggle}
      {...sound}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="text-muted-foreground hover:text-foreground relative overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        {dark ? (
          <motion.span
            key="moon"
            initial={{ y: 14, opacity: 0, rotate: -35 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -14, opacity: 0, rotate: 35 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="flex"
          >
            <MoonIcon size={18} className="text-brand" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ y: 14, opacity: 0, rotate: -35 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -14, opacity: 0, rotate: 35 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="flex"
          >
            <SunIcon size={18} className="text-amber-500" />
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
