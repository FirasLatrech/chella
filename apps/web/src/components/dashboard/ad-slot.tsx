"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type PanInfo } from "motion/react";
import { AltArrowRightIcon } from "@solar-icons/react/bold-duotone";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface AdSlide {
  id: string;
  title: string;
  sponsor: string;
  href: string;
}

const SLIDES: AdSlide[] = [
  { id: "1", title: "Hire Tunisian engineers", sponsor: "Chelaa Jobs", href: "/jobs" },
  { id: "2", title: "Ship your side project", sponsor: "Chelaa Projects", href: "/" },
  { id: "3", title: "Climb the leaderboard", sponsor: "Chelaa", href: "/leaderboard" },
];

const IMAGE = "/images/sky-background.webp";

/** Dwell time per card. The last one holds longer before looping back to the
 *  first, so the cycle reads as a deliberate pause rather than a spin. */
const INTERVAL = 5000;
const LAST_INTERVAL = 9000;
/** Horizontal travel needed to commit to the next card. */
const SWIPE_THRESHOLD = 45;

/*
 * Resting position per depth, fanned like loosely stacked paper: the cards
 * behind sit higher and lean to opposite sides, with a slight rotation so the
 * stack reads as physical rather than a mechanical offset.
 */
const FAN = [
  { scale: 1, x: 0, y: 0, rotate: 0, opacity: 1 },
  { scale: 0.95, x: -9, y: -14, rotate: -3, opacity: 1 },
  { scale: 0.9, x: 9, y: -25, rotate: 3, opacity: 0.6 },
] as const;

export function AdSlot({ collapsed }: { collapsed: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(
    (delta: number) =>
      setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length),
    [],
  );

  useEffect(() => {
    if (paused || collapsed) return;
    // setTimeout rather than setInterval: the delay varies per card, and the
    // timer restarts from zero whenever `index` changes — so a manual swipe
    // gives the new card its full dwell time instead of inheriting a
    // part-elapsed tick.
    const delay = index === SLIDES.length - 1 ? LAST_INTERVAL : INTERVAL;
    const id = setTimeout(() => advance(1), delay);
    return () => clearTimeout(id);
  }, [paused, collapsed, advance, index]);

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
        advance(info.offset.x < 0 ? 1 : -1);
      }
    },
    [advance],
  );

  // Too narrow to read when collapsed — hidden rather than shown as a sliver.
  if (collapsed) return null;

  return (
    <div
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className="flex flex-col gap-2"
    >
      {/*
       * Card deck. Three layers are always mounted: the front card plus two
       * peeking behind it, each scaled down and pushed up a few pixels so the
       * stack reads as physical depth rather than a flat carousel.
       */}
      <div className="relative h-[150px] select-none pt-7">
        {[2, 1, 0].map((depth) => {
          const slide = SLIDES[(index + depth) % SLIDES.length];
          const isFront = depth === 0;
          const fan = FAN[depth];

          return (
            <motion.div
              key={slide.id}
              className={cn(
                "absolute inset-x-0 top-0",
                isFront ? "z-30 cursor-grab active:cursor-grabbing" : "z-10",
              )}
              // Pivot from the bottom so the lean reads as paper resting on
              // the card below, not a card spinning in place.
              style={{ zIndex: 30 - depth, transformOrigin: "bottom center" }}
              animate={{
                scale: fan.scale,
                x: fan.x,
                y: fan.y,
                rotate: fan.rotate,
                opacity: fan.opacity,
              }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              drag={isFront ? "x" : false}
              dragSnapToOrigin
              dragElastic={0.16}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={isFront ? onDragEnd : undefined}
              whileDrag={{ scale: 1.02, cursor: "grabbing" }}
            >
              <AdCard slide={slide} interactive={isFront} />
            </motion.div>
          );
        })}
      </div>

      {/* Progress dots double as controls. */}
      <div className="flex items-center justify-center gap-1">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}`}
            aria-current={i === index || undefined}
            className="cursor-pointer p-1"
          >
            <span
              className={cn(
                "block h-1 rounded-full transition-all duration-300",
                i === index
                  ? "bg-foreground/60 w-4"
                  : "bg-foreground/20 hover:bg-foreground/40 w-1",
              )}
            />
          </button>
        ))}
      </div>

      <Link
        href="/sponsor"
        className={cn(
          "text-muted-foreground hover:text-foreground group flex items-center justify-center gap-1",
          "rounded-lg py-1 text-[11px] transition-colors",
        )}
      >
        Become a sponsor
        <AltArrowRightIcon
          size={12}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

/*
 * Same frame-inside-tint relationship as `Card`: a tinted shell with the
 * image as an inset panel, and the copy sitting on the shell below it.
 */
function AdCard({
  slide,
  interactive,
}: {
  slide: AdSlide;
  interactive: boolean;
}) {
  return (
    <Link
      href={slide.href}
      tabIndex={interactive ? 0 : -1}
      aria-hidden={!interactive}
      draggable={false}
      className={cn(
        // Opaque shell: a translucent card would let the card beneath show
        // through, which reads as ghosted text while dragging.
        "bg-background ring-border-surface-strong block rounded-2xl p-1.5 ring-[0.5px]",
        "shadow-sm shadow-black/5",
        interactive &&
          "transition-shadow duration-200 hover:shadow-lg hover:shadow-black/10",
      )}
    >
      <div className="ring-border-surface relative aspect-[16/9] w-full overflow-hidden rounded-xl ring-[0.5px]">
        <Image
          src={IMAGE}
          alt=""
          fill
          sizes="216px"
          draggable={false}
          className="pointer-events-none object-cover"
          priority={interactive}
        />
        <span className="absolute top-1.5 left-1.5 rounded-md bg-black/25 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white/90 backdrop-blur-sm">
          Ad
        </span>
      </div>

      <div className="px-1.5 pt-2 pb-1">
        <div className="truncate text-xs font-medium">{slide.title}</div>
        <div className="text-muted-foreground mt-0.5 truncate text-[11px]">
          {slide.sponsor}
        </div>
      </div>
    </Link>
  );
}
