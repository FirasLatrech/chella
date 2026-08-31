"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import type { FeedEntry } from "@/components/dashboard/feed-item";
import type { ContentEntry } from "@/lib/content";
import type { Me } from "@/lib/api";
import { queryKeys } from "@/lib/keys";

/*
 * Browser-side queries. Server pages prefetch the same keys through
 * lib/api.ts (cookie-forwarded) and hydrate them; these fetchers take over
 * on the client, carrying the session cookie via credentials.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4120";

export { queryKeys } from "@/lib/keys";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export function useFeed(initialData?: FeedEntry[]) {
  return useQuery({
    queryKey: queryKeys.feed,
    queryFn: () => get<FeedEntry[]>("/api/posts"),
    initialData,
    // Live-ish feed: new posts, votes and reply counts show up on their own.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export interface FeedCounts {
  all: number;
  question: number;
  project: number;
  post: number;
}

/*
 * Totals for the filter tabs. Counted in SQL rather than derived from
 * useFeed: that array is one capped page, so the chips used to report how
 * many of the newest 20 posts were questions. Polls on the feed's interval
 * so a chip never disagrees with the list it labels.
 */
export function useFeedCounts() {
  return useQuery({
    queryKey: queryKeys.feedCounts,
    queryFn: () => get<FeedCounts>("/api/posts/counts"),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useEntry(id: string, initialData?: ContentEntry) {
  return useQuery({
    queryKey: queryKeys.entry(id),
    queryFn: () => get<ContentEntry>(`/api/posts/${id}`),
    initialData,
    // Votes and new comments from other people land without a reload.
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

export interface PostPage {
  items: FeedEntry[];
  /** Cursor for the next page; "" when this is the last one. */
  next: string;
}

/*
 * Paged feed for the infinite lists. The flat useFeed stays for the small
 * derived reads (sidebar badge, tag options) — those want the whole set, not
 * page one.
 */
export function useInfinitePosts(params: Record<string, string> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.infinite(params),
    initialPageParam: "",
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams({ ...params, paged: "1", limit: "20" });
      if (pageParam) qs.set("cursor", String(pageParam));
      return get<PostPage>(`/api/posts?${qs}`);
    },
    getNextPageParam: (last) => last.next || undefined,
    // Every param change (kind tab, tag, search query) is a new key; holding
    // the previous board until the next one lands keeps the grid from
    // flashing empty on each keystroke.
    placeholderData: keepPreviousData,
    // Focus-refetch replays EVERY loaded page, so deep in the feed one
    // window focus is 50+ requests. staleTime keeps that to the cases where
    // the data has actually aged, without giving up focus freshness.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  kind: string;
  arrangement: string;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  tags: string[];
  description: string;
  applyUrl: string;
  minReputation: number;
  time: string;
  /** Tags this reader ranks on that the role asks for. */
  matchedTags: { tag: string; rank: number }[];
  qualified: boolean;
}

export function useJobs(initialData?: Job[]) {
  return useQuery({
    queryKey: queryKeys.jobs,
    queryFn: () => get<Job[]>("/api/jobs"),
    initialData,
    refetchOnWindowFocus: true,
  });
}

export interface ForYouData {
  /** Interests the suggestions matched — empty means none are set yet. */
  interests: string[];
  items: FeedEntry[];
}

/**
 * Interest-matched suggestions. Deliberately NOT the main feed: relevance
 * ordering isn't a monotonic key, so it can't back cursor pagination.
 */
export function useForYou(initialData?: ForYouData) {
  return useQuery({
    queryKey: queryKeys.forYou,
    queryFn: () => get<ForYouData>("/api/rails/for-you"),
    initialData,
    refetchOnWindowFocus: true,
  });
}

export interface TagOption {
  name: string;
  posts: number;
}

/** Real tags for the interest picker — users choose, they don't invent. */
export function useTags(initialData?: TagOption[]) {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => get<TagOption[]>("/api/tags"),
    initialData,
    staleTime: 5 * 60 * 1000,
  });
}

export interface BoardEntry {
  rank: number;
  handle: string;
  name: string;
  tags: string[];
  reputation: number;
  points: number;
}

export function useLeaderboard(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: queryKeys.leaderboard(params),
    queryFn: () => get<BoardEntry[]>(`/api/leaderboard?${qs}`),
    placeholderData: keepPreviousData,
  });
}

export interface NotificationItem {
  id: string;
  kind: "reply" | "thread" | "vote" | "accept";
  actor: string;
  time: string;
  read: boolean;
  postId: string;
  postTitle: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () =>
      get<{ items: NotificationItem[]; unread: number }>("/api/notifications"),
    refetchInterval: 30_000,
  });
}

export function useSaved(initialData?: FeedEntry[]) {
  return useQuery({
    queryKey: queryKeys.saved,
    queryFn: () => get<FeedEntry[]>("/api/saved"),
    initialData,
    refetchOnWindowFocus: true,
  });
}

/** Public profile — powers the header XP chip (reputation refreshes live). */
export function useProfile(handle: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(handle ?? ""),
    queryFn: () => get<ProfileDetail>(`/api/users/${handle}`),
    enabled: !!handle,
    refetchInterval: 60_000,
  });
}

export interface ProfileDetail {
  handle: string;
  name: string;
  reputation: number;
  weekly: number;
  tags: string[];
  bio: string;
  github: string;
  linkedin: string;
  website: string;
  cvUrl: string;
  avatar: string;
  interests: string[];
  emailNotifications: boolean;
  posts: number;
  answers: number;
  accepted: number;
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async (): Promise<Me | null> => {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface SearchPerson {
  handle: string;
  name: string;
  avatar?: string;
  tags: string[];
  reputation: number;
}

export interface UniversalSearchResults {
  posts: FeedEntry[];
  people: SearchPerson[];
  tags: { name: string; posts: number }[];
}

/*
 * ⌘K palette. Cached per search term, so re-opening the palette or
 * retyping a term already seen costs no request; the caller debounces the
 * input, and keepPreviousData holds the last results while the next term
 * resolves so the list never blanks mid-typing.
 */
export function useUniversalSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.universalSearch(q),
    queryFn: () =>
      get<UniversalSearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: enabled && q.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
