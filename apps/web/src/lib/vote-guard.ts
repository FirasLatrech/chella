/*
 * Client-side abuse guard for rapid voting.
 *
 * Tracks vote timestamps in a rolling window, shared across every card on
 * the page (module-level, not per-component) — the point is to catch
 * bot-like behaviour spread across many different posts, not just
 * mash-clicking one. Once the threshold trips, every vote is blocked until
 * the user clears a lightweight press-and-hold challenge; there's no
 * server-side captcha here, this is a UX speed bump, not a security
 * boundary.
 */

const WINDOW_MS = 4000;
const THRESHOLD = 3;

let timestamps: number[] = [];
let challenged = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeVoteGuard(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isChallenged() {
  return challenged;
}

/** Call before casting a vote. Returns false if the vote should be blocked. */
export function registerVote(): boolean {
  if (challenged) return false;

  const now = Date.now();
  timestamps = timestamps.filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);

  if (timestamps.length > THRESHOLD) {
    challenged = true;
    notify();
    return false;
  }
  return true;
}

/** Called once the press-and-hold challenge clears. */
export function clearChallenge() {
  challenged = false;
  timestamps = [];
  notify();
}
