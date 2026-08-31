"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

/*
 * Post imagery: thumbnails and heroes.
 *
 * A real <img> rather than a background-image div (which is what this used to
 * be), because only an element image gets `loading="lazy"` and
 * `decoding="async"` — the browser then keeps decode work off the main thread,
 * which is the difference between a smooth scroll and a hitch as each row
 * enters view. `object-cover` renders identically to `bg-cover bg-center`, so
 * nothing about the look changes.
 *
 * next/image isn't used here, deliberately. Post images are user-supplied
 * URLs from whatever the uploader returns (R2's public host is env-driven,
 * and dev falls back to local disk), so pointing the optimizer at them means
 * either re-listing hosts per environment in `next.config.ts` or opening
 * remotePatterns wide enough that the optimizer will fetch and re-serve
 * arbitrary remote images. Neither is worth it for a thumbnail: lazy loading
 * and async decode are the wins that matter at 1000 rows, and both are plain
 * attributes here.
 */

// Which sources have already decoded, kept at module scope so a row that
// scrolls out of the virtualizer and back doesn't replay its fade-in — the
// image is in the browser cache by then, and re-animating reads as a flicker.
const settled = new Set<string>();

export function CardImage({
  src,
  alt = "",
  className,
  sizes,
}: {
  src: string;
  alt?: string;
  className?: string;
  /** Passed through when the source offers responsive variants. */
  sizes?: string;
}) {
  const [ready, setReady] = useState(() => settled.has(src));

  const settle = useCallback(() => {
    settled.add(src);
    setReady(true);
  }, [src]);

  // A cached image can finish loading before React attaches onLoad, which
  // would strand it at opacity-0 — the ref catches that via `complete`.
  // (Done here rather than in an effect: this project's lint bans setState
  // inside effects.)
  const ref = useCallback(
    (el: HTMLImageElement | null) => {
      if (el?.complete) settle();
    },
    [settle],
  );

  return (
    <>
      {/* Holds the frame while the bytes arrive, so a loading card is a calm
          surface rather than an empty white box. */}
      <div
        aria-hidden
        className={cn(
          "bg-muted absolute inset-0 transition-opacity duration-300",
          ready ? "opacity-0" : "animate-pulse opacity-100",
        )}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- see the note
          above: the optimizer would need remote hosts that vary per
          environment, and lazy + async decode are what this needs. */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        sizes={sizes}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={settle}
        // Fades up from a slight blur and scale instead of snapping in. The
        // transition lists its properties explicitly so it never fights the
        // hover zoom the card layers on top of this element.
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          "transition-[opacity,filter,transform] duration-500 ease-out motion-reduce:transition-none",
          ready
            ? "scale-100 opacity-100 blur-0"
            : "scale-[1.03] opacity-0 blur-md",
          className,
        )}
      />
    </>
  );
}
