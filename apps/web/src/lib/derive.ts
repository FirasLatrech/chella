import type { FeedEntry } from "@/components/dashboard/feed-item";

/*
 * Pure derivations over feed data. Shared by server pages and client
 * components (React Query consumers), so this module must stay free of
 * server-only imports.
 */

export interface ProfileLink {
  platform: "GitHub" | "Website" | "LinkedIn" | "CV";
  href: string;
}

export interface ProfileStats {
  handle: string;
  name: string;
  rank: number;
  reputation: number;
  posts: number;
  votes: number;
  views: number;
  tags: string[];
  entries: FeedEntry[];
  links: ProfileLink[];
  bio: string;
  cvUrl: string;
  activity: { days: Record<string, number>; total: number };
}

export function relatedTo(
  entry: { id: string; tags: string[] },
  all: FeedEntry[],
  limit = 3,
): FeedEntry[] {
  return all
    .filter((e) => e.id !== entry.id && e.tags.some((t) => entry.tags.includes(t)))
    .slice(0, limit);
}
