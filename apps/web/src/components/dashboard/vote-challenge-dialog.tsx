"use client";

import { useRef, useState } from "react";
import { ShieldCheckIcon } from "@solar-icons/react/bold-duotone";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { clearChallenge } from "@/lib/vote-guard";

const HOLD_MS = 900;

/*
 * Lightweight in-app "are you a bot" speed bump for rapid voting.
 *
 * Not a real captcha — no third-party service, no server verification. It
 * exists to slow down mash-clicking / scripted voting across many posts,
 * not to defeat a determined attacker.
 */
export function VoteChallengeDialog({ open }: { open: boolean }) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  function stop() {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = null;
    start.current = null;
    setProgress(0);
  }

  function tick(now: number) {
    if (start.current === null) start.current = now;
    const elapsed = now - start.current;
    const next = Math.min(1, elapsed / HOLD_MS);
    setProgress(next);
    if (next >= 1) {
      stop();
      clearChallenge();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }

  function press() {
    stop();
    frame.current = requestAnimationFrame(tick);
  }

  return (
    <Dialog open={open} onClose={() => {}} className="max-w-sm text-center">
      <div className="bg-brand/10 text-brand-content mx-auto grid size-14 place-items-center rounded-2xl">
        <ShieldCheckIcon size={28} />
      </div>

      <h2 className="mt-4 text-lg font-semibold tracking-tight">
        Whoa, slow down
      </h2>
      <p className="text-muted-foreground mt-1.5 text-sm">
        That&rsquo;s a lot of votes in a hurry. Press and hold to confirm
        you&rsquo;re not a bot.
      </p>

      <button
        type="button"
        onPointerDown={press}
        onPointerUp={stop}
        onPointerLeave={stop}
        className={cn(
          "relative mx-auto mt-6 flex h-11 w-full max-w-56 cursor-pointer items-center justify-center overflow-hidden rounded-xl select-none",
          "bg-muted ring-border-surface-strong ring-[0.5px]",
        )}
      >
        <span
          className="bg-brand/20 absolute inset-y-0 left-0"
          style={{
            width: `${progress * 100}%`,
            transition: progress === 0 ? "width 150ms ease-out" : "none",
          }}
        />
        <span className="relative text-sm font-medium">
          {progress > 0 ? "Keep holding…" : "Press and hold"}
        </span>
      </button>
    </Dialog>
  );
}
