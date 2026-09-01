"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useGSAP } from "@gsap/react";
import { AltArrowRightIcon } from "@solar-icons/react/bold-duotone";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useInteractionSound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { STAGE_SCENES } from "./product-stage";
import { LandingClose } from "./landing-close";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, useGSAP);
}

const COPY: {
  id: string;
  n: string;
  kicker: string;
  title: ReactNode;
  body: string;
}[] = [
  {
    id: "feed",
    n: "01",
    kicker: "The room",
    title: (
      <>
        Where Tunisia&rsquo;s engineers build{" "}
        <span className="text-brand-content">their name.</span>
      </>
    ),
    body: "Questions, projects and answers in one feed. Standing from the work — never from a CV.",
  },
  {
    id: "projects",
    n: "02",
    kicker: "Projects",
    title: (
      <>
        Show the work, not a{" "}
        <span className="text-brand-content">deck.</span>
      </>
    ),
    body: "Projects sit in the same feed as questions. Ship in public, keep the credit.",
  },
  {
    id: "leaderboard",
    n: "03",
    kicker: "Leaderboard",
    title: (
      <>
        Reputation you can actually{" "}
        <span className="text-brand-content">read.</span>
      </>
    ),
    body: "A weekly board from posts, answers and votes. Nothing here comes from a CV.",
  },
  {
    id: "jobs",
    n: "04",
    kicker: "Jobs",
    title: (
      <>
        Roles find people by what they{" "}
        <span className="text-brand-content">ship.</span>
      </>
    ),
    body: "Listings rank against the tags you actually contribute in — reputation is a signal, never a gate.",
  },
];

const LAST = COPY.length - 1;

export function LandingPage() {
  const sound = useInteractionSound();
  const root = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const [index, setIndex] = useState(0);

  useGSAP(
    () => {
      const copies = gsap.utils.toArray<HTMLElement>("[data-copy]");
      const panels = gsap.utils.toArray<HTMLElement>("[data-panel]");
      if (!copies.length || copies.length !== panels.length) return;

      const lastI = copies.length - 1;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const html = document.documentElement;
      const prevScroll = html.style.scrollBehavior;
      const prevOverflowX = html.style.overflowX;
      html.style.scrollBehavior = "auto";
      html.style.overflowX = "clip";

      gsap.set(copies.slice(1), { autoAlpha: 0, y: 18 });
      gsap.set(panels.slice(1), { autoAlpha: 0, y: 28 });
      gsap.set([copies[0], panels[0]], { autoAlpha: 1, y: 0 });

      const pin = {
        trigger: root.current,
        start: "top top",
        end: () => `+=${lastI * window.innerHeight}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      };

      const syncIndex = (progress: number) => {
        const i = Math.round(progress * lastI);
        setIndex((prev) => (prev === i ? prev : i));
      };

      if (reduce) {
        const st = ScrollTrigger.create({
          ...pin,
          onUpdate: (self) => {
            const i = Math.round(self.progress * lastI);
            syncIndex(self.progress);
            copies.forEach((el, j) =>
              gsap.set(el, { autoAlpha: j === i ? 1 : 0, y: 0 }),
            );
            panels.forEach((el, j) =>
              gsap.set(el, { autoAlpha: j === i ? 1 : 0, y: 0 }),
            );
          },
        });
        stRef.current = st;
        return () => {
          html.style.scrollBehavior = prevScroll;
          html.style.overflowX = prevOverflowX;
        };
      }

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut", duration: 0.55 },
        scrollTrigger: {
          ...pin,
          scrub: 0.65,
          onUpdate: (self) => syncIndex(self.progress),
        },
      });

      stRef.current = tl.scrollTrigger ?? null;

      for (let i = 0; i < lastI; i++) {
        const at = i + 0.38;
        tl.to(copies[i], { autoAlpha: 0, y: -14 }, at)
          .to(panels[i], { autoAlpha: 0, y: -20 }, at)
          .fromTo(
            copies[i + 1],
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0 },
            at + 0.06,
          )
          .fromTo(
            panels[i + 1],
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, y: 0 },
            at + 0.06,
          );
      }

      tl.to({}, { duration: 0.45 });

      return () => {
        html.style.scrollBehavior = prevScroll;
        html.style.overflowX = prevOverflowX;
      };
    },
    { scope: root },
  );

  function goTo(i: number) {
    const st = stRef.current;
    if (!st) return;
    const y = st.start + (i / LAST) * (st.end - st.start);
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      st.scroll(y);
      return;
    }
    gsap.to(window, {
      scrollTo: y,
      duration: 0.7,
      ease: "power2.inOut",
      overwrite: true,
    });
  }

  return (
    <div className="app-backdrop">
      <div
        ref={root}
        className="flex h-dvh flex-col overflow-hidden lg:flex-row"
      >
      <div className="flex min-h-0 w-full shrink-0 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 md:px-8 lg:max-w-[34rem] lg:flex-1 lg:px-10 lg:pb-10 xl:max-w-[38rem]">
        <header className="enter-up flex items-center gap-3">
          <Link
            href="/"
            data-logo-hover
            className="group/logo flex items-center gap-2"
            {...sound}
          >
            <Logo className="logo-mark text-foreground h-6 w-auto" />
            <span className="text-lg leading-none font-semibold tracking-[-0.02em]">
              Chelaa
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Button
              as={Link}
              href="/login"
              variant="ghost"
              size="sm"
              shape="pill"
              className="hidden sm:inline-flex"
              {...sound}
            >
              Sign in
            </Button>
            <Button
              as={Link}
              href="/login?signup=1"
              variant="brand"
              size="sm"
              shape="pill"
              {...sound}
            >
              Join
            </Button>
          </div>
        </header>

        <div className="enter-up mt-6 flex min-h-0 flex-col lg:mt-0 lg:flex-1 lg:justify-center lg:py-0">
          <div className="relative min-h-[9.5rem] sm:min-h-[12.5rem] lg:min-h-[17rem]">
            {COPY.map((item, i) => (
              <div
                key={item.id}
                data-copy
                className={cn(
                  "absolute inset-x-0 top-0",
                  i !== 0 && "invisible",
                )}
              >
                <p className="text-muted-foreground flex items-baseline gap-2 text-xs font-medium tracking-wide">
                  <span className="tabular-nums">{item.n}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.kicker}</span>
                </p>
                <h1 className="mt-3 max-w-[16ch] text-[1.85rem] leading-[1.12] font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.85rem]">
                  {item.title}
                </h1>
                <p className="text-muted-foreground mt-3 max-w-[38ch] text-sm leading-relaxed text-pretty sm:mt-4 sm:text-base">
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          <p className="sr-only" aria-live="polite">
            {COPY[index].kicker}. {COPY[index].body}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2 lg:mt-8">
            <Button
              as={Link}
              href="/login?signup=1"
              variant="brand"
              size="lg"
              shape="pill"
              {...sound}
            >
              Join Chelaa
              <AltArrowRightIcon size={16} />
            </Button>
            <Button
              as={Link}
              href="/login"
              variant="ghost"
              size="lg"
              shape="pill"
              className="sm:hidden"
              {...sound}
            >
              Sign in
            </Button>
          </div>

          <div
            className="mt-6 flex items-center gap-2 lg:mt-8"
            role="tablist"
            aria-label="Features"
          >
            {COPY.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${item.n} ${item.kicker}`}
                onClick={() => goTo(i)}
                className={cn(
                  "h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-300",
                  i === index
                    ? "bg-foreground w-5"
                    : "bg-foreground/20 hover:bg-foreground/40 w-1.5",
                )}
              />
            ))}
          </div>
        </div>

        <p className="text-muted-foreground/70 mt-auto hidden pt-6 text-xs lg:block">
          Free for the people who contribute to it.
        </p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 px-3 pb-3 lg:flex-[1.35] lg:p-0">
        <div
          aria-hidden="true"
          className="relative min-h-0 w-full flex-1 overflow-hidden rounded-2xl lg:rounded-none lg:rounded-l-2xl"
        >
          {STAGE_SCENES.map((scene, i) => (
            <div
              key={scene.id}
              data-panel
              className={cn(
                "pointer-events-none absolute inset-0 overflow-hidden rounded-2xl lg:rounded-none lg:rounded-l-2xl",
                i !== 0 && "invisible",
              )}
            >
              {scene.node}
            </div>
          ))}
        </div>
      </div>
      </div>
      <LandingClose />
    </div>
  );
}
