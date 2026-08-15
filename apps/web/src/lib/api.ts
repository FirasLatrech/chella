import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { FeedEntry } from "@/components/dashboard/feed-item";
import type { ContentEntry } from "@/lib/content";
import type { LeaderboardEntry } from "@/components/leaderboard";
import type { ProfileStats } from "@/lib/derive";
import type { ProfileBadge } from "@/components/profile/badge-shelf";

/*
 * Server-side client for the Go API. Every request forwards the incoming
 * session cookie so reads are per-user (myVote etc.). Importing next/headers
 * makes this module server-only — client components use lib/queries.ts and
 * lib/mutations.ts instead.
 *
 * Next.js does not read the repo-root .env; the default keeps dev working
 * with zero env plumbing.
 */
const API_URL = process.env.API_URL ?? "http://localhost:4120";

async function apiFetch(path: string): Promise<Response> {
  const cookie = (await cookies()).toString();
  return fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: cookie ? { Cookie: cookie } : undefined,
  });
}

export interface Me {
  handle: string;
  name: string;
}

export async function fetchMe(): Promise<Me | null> {
  const res = await apiFetch("/api/auth/me");
  if (!res.ok) return null;
  return res.json();
}

/**
 * Auth guard, layer 2: validates the session against the API (the proxy only
 * checks that a cookie exists). Call at the top of every protected page.
 */
export async function requireAuth(next?: string): Promise<Me> {
  const me = await fetchMe();
  if (!me) {
    redirect(
      next && next !== "/"
        ? `/login?next=${encodeURIComponent(next)}`
        : "/login",
    );
  }
  return me;
}

export async function fetchFeed(): Promise<FeedEntry[]> {
  const res = await apiFetch("/api/posts");
  if (!res.ok) throw new Error(`GET /api/posts failed: ${res.status}`);
  return res.json();
}

export interface PostPageServer {
  items: FeedEntry[];
  next: string;
}

/** One page of the feed — used to prefetch the infinite lists on the server. */
export async function fetchPostPage(
  params: Record<string, string> = {},
): Promise<PostPageServer> {
  const qs = new URLSearchParams({ ...params, paged: "1", limit: "20" });
  const res = await apiFetch(`/api/posts?${qs}`);
  if (!res.ok) return { items: [], next: "" };
  return res.json();
}

export async function fetchJobs(): Promise<unknown[]> {
  const res = await apiFetch("/api/jobs");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSaved(): Promise<FeedEntry[]> {
  const res = await apiFetch("/api/saved");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchEntry(id: string): Promise<ContentEntry | null> {
  const res = await apiFetch(`/api/posts/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /api/posts/${id} failed: ${res.status}`);
  return res.json();
}

export interface TopContributor {
  handle: string;
  name: string;
  reputation: number;
  weekly: number;
}

export interface TrendingTag {
  name: string;
  posts: number;
  growth: number;
  prev: number;
}

export async function fetchTopWeek(): Promise<TopContributor[]> {
  const res = await apiFetch("/api/rails/top-week");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTrendingTags(): Promise<TrendingTag[]> {
  const res = await apiFetch("/api/rails/trending-tags");
  if (!res.ok) return [];
  return res.json();
}

export interface TagRank {
  tag: string;
  rank: number;
}

export interface Profile {
  handle: string;
  name: string;
  joined: string;
  posts: number;
  answers: number;
  accepted: number;
  reputation: number;
  tags: string[];
  weekly: number;
  tagRanks?: TagRank[];
  bio: string;
  github: string;
  linkedin: string;
  website: string;
  cvUrl: string;
  avatar: string;
  emailNotifications: boolean;
  badges?: ProfileBadge[];
}

export interface Activity {
  days: Record<string, number>;
  total: number;
}

export async function fetchActivity(handle: string): Promise<Activity> {
  const res = await apiFetch(`/api/users/${handle}/activity`);
  if (!res.ok) return { days: {}, total: 0 };
  return res.json();
}

export interface BoardEntryServer {
  rank: number;
  handle: string;
  name: string;
  tags: string[];
  reputation: number;
  points: number;
}

export async function fetchBoard(
  params: Record<string, string>,
): Promise<BoardEntryServer[]> {
  const qs = new URLSearchParams(params).toString();
  const res = await apiFetch(`/api/leaderboard?${qs}`);
  if (!res.ok) throw new Error(`GET /api/leaderboard failed: ${res.status}`);
  return res.json();
}

export async function fetchProfile(handle: string): Promise<Profile | null> {
  const res = await apiFetch(`/api/users/${handle}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPeople(): Promise<Profile[]> {
  const res = await apiFetch("/api/users");
  if (!res.ok) throw new Error(`GET /api/users failed: ${res.status}`);
  return res.json();
}

export async function fetchUserPosts(handle: string): Promise<FeedEntry[]> {
  const res = await apiFetch(`/api/users/${handle}/posts`);
  if (!res.ok) return [];
  return res.json();
}

/*
 * Leaderboard and profiles read the SERVER reputation formula (the brief's
 * point values, computed in SQL) — one source of truth, no client-side
 * re-derivation to drift from it. `change` carries points earned this week.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const board = await fetchBoard({ period: "all", tag: "" });
  return board.map((e) => ({
    rank: e.rank,
    name: e.name,
    handle: e.handle,
    tags: e.tags,
    reputation: e.reputation,
  }));
}

export async function fetchProfileStats(handle: string): Promise<
  | (ProfileStats & {
      tagRanks: TagRank[];
      github: string;
      linkedin: string;
      website: string;
      badges: ProfileBadge[];
      avatar: string;
      emailNotifications: boolean;
    })
  | null
> {
  const [people, entries, detail, activity] = await Promise.all([
    fetchPeople(),
    fetchUserPosts(handle),
    fetchProfile(handle),
    fetchActivity(handle),
  ]);
  const rank = people.findIndex((p) => p.handle === handle);
  if (rank < 0 || !detail) return null;
  const p = people[rank];
  // Only links the user actually saved on their profile.
  const links: ProfileStats["links"] = [];
  if (detail.github) links.push({ platform: "GitHub", href: detail.github });
  if (detail.linkedin) links.push({ platform: "LinkedIn", href: detail.linkedin });
  if (detail.website) links.push({ platform: "Website", href: detail.website });
  return {
    handle,
    name: p.name,
    rank: rank + 1,
    reputation: p.reputation,
    posts: p.posts,
    votes: entries.reduce((sum, e) => sum + e.votes, 0),
    views: entries.reduce((sum, e) => sum + e.views, 0),
    tags: p.tags,
    entries,
    links,
    bio: detail.bio,
    github: detail.github,
    linkedin: detail.linkedin,
    website: detail.website,
    cvUrl: detail.cvUrl,
    avatar: detail.avatar,
    emailNotifications: detail.emailNotifications,
    activity,
    tagRanks: detail.tagRanks ?? [],
    badges: detail.badges ?? [],
  };
}

// Pure derivations live in lib/derive.ts (client-safe); re-exported here so
// existing server pages keep their imports.
export {
  questionsFromFeed,
  relatedTo,
  type ProfileLink,
  type ProfileStats,
} from "@/lib/derive";
