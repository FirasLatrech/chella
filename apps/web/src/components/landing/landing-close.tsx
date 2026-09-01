"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  AltArrowRightIcon,
  LetterIcon,
  CupStarIcon,
  CodeSquareIcon,
  CheckCircleIcon,
  HandStarsIcon,
} from "@solar-icons/react/bold-duotone";
import { skyPosition } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

const CONTACT = "sponsor@chelaa.tech";

const FORMULA = [
  { pts: "+5", what: "a post" },
  { pts: "+10", what: "a project" },
  { pts: "+5", what: "an answer" },
  { pts: "+20", what: "accepted" },
  { pts: "+3", what: "an upvote" },
];

const STAMPS = [
  { label: "#1 Go", Icon: CupStarIcon },
  { label: "Builder ×3", Icon: CodeSquareIcon },
  { label: "Problem solver ×11", Icon: CheckCircleIcon },
  { label: "Helper ×24", Icon: HandStarsIcon },
];

const LEVEL = [
  "bg-foreground/[0.06]",
  "bg-brand/25",
  "bg-brand/45",
  "bg-brand/70",
  "bg-brand",
];

const WEEKS = 52;
const DAYS = 7;

function yearFromSeed(seed: string) {
  const n = WEEKS * DAYS;
  const out = new Array<number>(n);
  let h = 2166136261;
  for (let i = 0; i < n; i++) {
    h ^= seed.charCodeAt(i % seed.length) + i;
    h = Math.imul(h, 16777619);
    const week = Math.floor(i / DAYS);
    const quiet = week < 6 || week > 46 ? 4 : 0;
    const r = (h >>> 0) % (12 + quiet);
    out[i] = r < 4 + quiet ? 0 : r < 8 ? 1 : r < 10 ? 2 : r < 12 ? 3 : 4;
  }
  return out;
}

const YEAR = yearFromSeed("ahmed");

export function LandingClose() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
      const numeral = root.current?.querySelector("[data-numeral]");
      const year = root.current?.querySelector("[data-year]");
      if (!numeral || !year) return;

      gsap.from(numeral, {
        y: 40,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 72%" },
      });
      gsap.from(year.children, {
        autoAlpha: 0,
        stagger: 0.003,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: { trigger: root.current, start: "top 64%" },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="flex min-h-dvh w-full min-w-0 flex-col lg:flex-row"
    >
      <div className="flex min-w-0 w-full shrink-0 flex-col justify-center px-5 pt-16 pb-8 md:px-8 lg:max-w-[34rem] lg:flex-1 lg:px-10 lg:py-20 xl:max-w-[38rem]">
        <p className="text-muted-foreground text-xs font-medium tracking-wide">
          <span className="tabular-nums">05</span>
          <span aria-hidden="true"> · </span>
          The name
        </p>
        <h2 className="mt-3 max-w-[14ch] text-[2.1rem] leading-[1.08] font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.85rem]">
          What you ship is what people{" "}
          <span className="text-brand-content">see.</span>
        </h2>
        <p className="text-muted-foreground mt-4 max-w-[36ch] text-sm leading-relaxed text-pretty sm:text-base">
          No PDF. The year is the proof — every cell a day you showed up.
        </p>

        <dl className="mt-8 grid max-w-[16rem] grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[11px] tracking-wide">
          {FORMULA.map((row) => (
            <div key={row.what} className="contents">
              <dt className="text-brand-content tabular-nums">{row.pts}</dt>
              <dd className="text-muted-foreground">{row.what}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap items-center gap-2">
          <Button
            as={Link}
            href="/login?signup=1"
            variant="brand"
            size="lg"
            shape="pill"
          >
            Join Chelaa
            <AltArrowRightIcon size={16} />
          </Button>
          <Button
            as="a"
            href={`mailto:${CONTACT}`}
            variant="ghost"
            size="lg"
            shape="pill"
          >
            <LetterIcon size={16} />
            Hiring
          </Button>
        </div>
        <p className="text-muted-foreground/70 mt-12 text-xs lg:mt-auto lg:pt-16">
          Chelaa · Free for the people who contribute to it.
          <span aria-hidden="true"> · </span>
          <a href={`mailto:${CONTACT}`} className="hover:text-foreground">
            {CONTACT}
          </a>
        </p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 px-3 pb-3 lg:flex-[1.35] lg:p-0">
        <div
          aria-hidden="true"
          className="bg-background ring-border-surface-strong relative flex min-h-[28rem] w-full min-w-0 flex-col overflow-hidden rounded-2xl ring-[0.5px] lg:min-h-0 lg:rounded-none lg:rounded-l-2xl"
        >
          <div className="relative min-h-[14rem] flex-[1.15]">
            <div
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={skyPosition("ahmed")}
            />
            <div className="from-background absolute inset-0 bg-gradient-to-t via-background/25 to-transparent" />
            <span
              data-numeral
              className="text-foreground/15 pointer-events-none absolute right-0 bottom-[-0.28em] font-semibold tracking-tighter select-none"
              style={{
                fontSize: "min(48vw, 19rem)",
                lineHeight: 0.75,
              }}
            >
              1
            </span>
          </div>

          <div className="relative flex flex-col px-5 pt-1 pb-6 md:px-8 md:pb-8">
            <p className="text-muted-foreground text-xs">@ahmed</p>
            <div className="mt-0.5 flex items-baseline justify-between gap-4">
              <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Ahmed
              </h3>
              <p className="text-brand-content shrink-0 text-sm font-semibold tabular-nums">
                {formatPoints(8420)}
              </p>
            </div>
            <p className="text-muted-foreground mt-2 max-w-[36ch] text-sm text-pretty">
              One binary. Open data for Tunisia. The feed is the CV.
            </p>

            <div
              data-year
              className="mt-6 grid w-full min-w-0 gap-px"
              style={{
                gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${DAYS}, minmax(0, 1fr))`,
                gridAutoFlow: "column",
              }}
            >
              {YEAR.map((level, i) => (
                <span
                  key={i}
                  className={cn("aspect-square rounded-[1px]", LEVEL[level])}
                />
              ))}
            </div>
            <p className="text-muted-foreground mt-2 text-[11px] tabular-nums">
              56 contributions · 842 votes · 12k views
            </p>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {STAMPS.map((stamp) => {
                const Icon = stamp.Icon;
                return (
                  <span
                    key={stamp.label}
                    className="bg-foreground/[0.04] ring-border-surface-strong flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-[0.5px]"
                  >
                    <Icon size={12} className="text-brand-content" />
                    {stamp.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
