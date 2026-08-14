import type { FeedEntry } from "@/components/dashboard/feed-item";
import type { LeaderboardEntry } from "@/components/leaderboard";

/*
 * Content types shared between the UI and the API client. The data itself
 * lives in Postgres now (see apps/api — the original mock store was ported
 * into its seed); the Go API serves these exact shapes.
 */

/*
 * Stored post body. Persisted as jsonb and rendered to every reader, so the
 * set is a closed whitelist of plain-text blocks — never HTML. The Go API
 * validates incoming blocks against this same list (see sanitizeBlocks).
 */
export type Block =
  | { type: "p"; text: string }
  | { type: "heading"; level: 1 | 2; text: string }
  | { type: "code"; lang?: string; code: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "quote"; text: string };

export interface Reply {
  id: string;
  author: string;
  time: string;
  text: string;
  votes: number;
  accepted?: boolean;
  /** Whether the requesting user has upvoted this reply. */
  myVote?: boolean;
  /** Body was changed after posting. */
  edited?: boolean;
  /** The requesting user wrote this. */
  mine?: boolean;
}

export interface ContentEntry extends Omit<FeedEntry, "replies"> {
  replies?: number;
  blocks: Block[];
  discussion: Reply[];
}

/*
 * Leaderboard data — still mock. Reputation math is its own backend design
 * conversation (quality-weighted scoring); until then the board is static.
 */
export function leaderboardEntries(): LeaderboardEntry[] {
  return [
    { rank: 1, name: "Ahmed", handle: "ahmed", tags: ["Go", "Postgres"], reputation: 8420, change: 2 },
    { rank: 2, name: "Firas", handle: "firas", tags: ["React", "Startup"], reputation: 7920, change: 1 },
    { rank: 3, name: "Sarra", handle: "sarra", tags: ["Next.js", "Maps"], reputation: 6510, change: -1 },
    { rank: 4, name: "Mehdi", handle: "mehdi", tags: ["AI", "NLP"], reputation: 5980, change: 0 },
    { rank: 5, name: "Nour", handle: "nour", tags: ["Data", "Careers"], reputation: 5240, change: 3 },
    { rank: 6, name: "Yassine", handle: "yassine", tags: ["DevOps"], reputation: 4610, change: -2 },
    { rank: 7, name: "Rania", handle: "rania", tags: ["Design"], reputation: 4180, change: 1 },
    { rank: 8, name: "Khaled", handle: "khaled", tags: ["Flutter"], reputation: 3720, change: 0 },
    { rank: 9, name: "Ines", handle: "ines", tags: ["Python", "AI"], reputation: 3350, change: 4 },
    { rank: 10, name: "Omar", handle: "omar", tags: ["Security"], reputation: 2980, change: -1 },
  ];
}
