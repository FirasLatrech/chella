/*
 * Theme switching with the View Transitions API.
 *
 * Technique adapted from skiper-ui/skiper26: inject a keyframe that animates a
 * clip-path on the incoming ::view-transition layer, then flip the theme inside
 * document.startViewTransition() so the browser cross-fades between the two
 * rendered states. The new theme wipes in as an expanding circle from the
 * element that was clicked.
 *
 * Falls back to an instant switch where View Transitions is unsupported, and is
 * skipped entirely under prefers-reduced-motion.
 */

const STYLE_ID = "theme-transition-styles";
const DURATION = 550;

function writeKeyframes(cx: number, cy: number, radius: number) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }

  el.textContent = `
    @keyframes theme-reveal {
      from { clip-path: circle(0px at ${cx}px ${cy}px); }
      to   { clip-path: circle(${radius}px at ${cx}px ${cy}px); }
    }

    /* Both layers are painted; only the incoming one is clipped, so the old
       theme stays put underneath instead of fading and showing the page
       background through the seam. */
    ::view-transition-old(root) {
      animation: none;
      z-index: 0;
    }
    ::view-transition-new(root) {
      animation: theme-reveal ${DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1;
    }
  `;
}

type StartPoint = { x: number; y: number };

export function switchTheme(toDark: boolean, origin?: StartPoint) {
  const root = document.documentElement;

  const apply = () => {
    root.classList.toggle("dark", toDark);
    try {
      localStorage.setItem("theme", toDark ? "dark" : "light");
    } catch {}
  };

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced || !document.startViewTransition) {
    apply();
    return;
  }

  // Default to the viewport centre when no origin is given.
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;

  // Radius must reach the furthest corner, or the reveal stops short.
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  writeKeyframes(x, y, radius);
  document.startViewTransition(apply);
}
