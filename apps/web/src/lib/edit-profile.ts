/*
 * Global open/close state for the profile editor.
 *
 * The modal used to live on the profile page and be opened by `?edit=1`, so
 * anything wanting to edit a profile had to NAVIGATE there first — you lost
 * your place in the feed to change a bio. The dialog now mounts once in the
 * Shell and listens here, so any control anywhere opens it in place.
 *
 * Module-level rather than React context: same pattern as lib/vote-guard.ts,
 * and it means a plain function call (not a hook) can open the modal.
 */

let open = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeEditProfile(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isEditProfileOpen() {
  return open;
}

export function openEditProfile() {
  if (open) return;
  open = true;
  notify();
}

export function closeEditProfile() {
  if (!open) return;
  open = false;
  notify();
}
