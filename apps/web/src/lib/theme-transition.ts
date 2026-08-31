/*
 * Theme switching with the View Transitions API.
 *
 * The circle is driven by the Web Animations API on ::view-transition-new
 * AFTER transition.ready — injecting @keyframes into a <style> tag and
 * starting the transition in the same turn let the UA's 250ms fade run
 * first, so the wipe froze mid-screen and then jumped to finish.
 *
 * Falls back to an instant switch where View Transitions is unsupported,
 * and is skipped entirely under prefers-reduced-motion.
 */

const DURATION = 400;

type StartPoint = { x: number; y: number };

let inFlight: Promise<void> | null = null;

function applyTheme(toDark: boolean) {
  document.documentElement.classList.toggle("dark", toDark);
  try {
    localStorage.setItem("theme", toDark ? "dark" : "light");
  } catch {
    /* private mode */
  }
}

export function switchTheme(toDark: boolean, origin?: StartPoint) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced || !document.startViewTransition) {
    applyTheme(toDark);
    return;
  }

  // A second click while the wipe is in flight would throw InvalidStateError
  // and leave the theme half-applied.
  if (inFlight) return;

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  // Furthest viewport corner, plus slack — the snapshot can be larger than
  // innerWidth/innerHeight, and a short radius is what made the circle
  // stop short then pop to the new theme.
  const radius =
    Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    ) * 1.2;

  const run = async () => {
    try {
      const transition = document.startViewTransition(() => {
        applyTheme(toDark);
      });
      await transition.ready;
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: DURATION,
          easing: "ease-out",
          fill: "both",
          pseudoElement: "::view-transition-new(root)",
        },
      );
      await transition.finished;
    } catch {
      applyTheme(toDark);
    } finally {
      inFlight = null;
    }
  };

  inFlight = run();
}
