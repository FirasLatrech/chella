"use client";

import { useCallback } from "react";
import { playClickSound } from "./sound";

/**
 * Click feedback for a control.
 *
 * Spread onto an element: `<Link {...useInteractionSound()} />`.
 *
 * Fires on `pointerdown` rather than `click`, so it sounds at the moment of
 * press and repeats on every press — including repeated clicks on the item
 * that is already active, where no navigation or re-render occurs.
 *
 * Sound is skipped when the user has muted it (handled inside the play
 * function) or prefers reduced motion.
 */
export function useInteractionSound(options?: {
  volume?: number;
  pitch?: number;
}) {
  const { volume = 0.12, pitch = 1.2 } = options ?? {};

  const onPointerDown = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    playClickSound(volume, pitch);
  }, [volume, pitch]);

  return { onPointerDown };
}
