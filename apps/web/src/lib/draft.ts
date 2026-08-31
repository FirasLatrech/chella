import type { Block } from "./content";
import type { FeedKind } from "@/components/dashboard/feed-item";

export interface ComposerDraft {
  kind: FeedKind;
  title: string;
  /** Plain text — validation and the excerpt fallback. */
  body: string;
  /** Structured body; what actually gets stored (and restored). */
  blocks?: Block[];
  tags: string[];
  imageUrl?: string;
}

/*
 * The composer's draft, persisted per user in localStorage so a closed tab
 * (or a 401 → login round-trip) never costs someone a half-written project
 * post. One draft per person: it is a place to resume, not a drafts folder.
 *
 * `markResume` is the 401 handshake — the draft itself is already saved by
 * autosave; the flag only tells the composer to open expanded on return
 * rather than sit as a collapsed "Draft" pill.
 */
const key = (handle: string) => `chelaa:draft:${handle}`;
const RESUME = "chelaa:draft:resume";

export function isEmptyDraft(d: ComposerDraft) {
  return !d.title.trim() && !d.body.trim() && d.tags.length === 0;
}

export function loadDraft(handle: string): ComposerDraft | null {
  try {
    const raw = localStorage.getItem(key(handle));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ComposerDraft;
    return isEmptyDraft(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/** Persists the draft — or removes it when there is nothing left to keep,
 *  so an abandoned empty composer never shows a "Draft" pill. */
export function saveDraft(handle: string, draft: ComposerDraft) {
  try {
    if (isEmptyDraft(draft)) localStorage.removeItem(key(handle));
    else localStorage.setItem(key(handle), JSON.stringify(draft));
  } catch {}
}

export function clearDraft(handle: string) {
  try {
    localStorage.removeItem(key(handle));
  } catch {}
}

export function markResume() {
  try {
    sessionStorage.setItem(RESUME, "1");
  } catch {}
}

/** Reads and clears the resume flag. */
export function takeResume() {
  try {
    const set = sessionStorage.getItem(RESUME) === "1";
    if (set) sessionStorage.removeItem(RESUME);
    return set;
  } catch {
    return false;
  }
}
