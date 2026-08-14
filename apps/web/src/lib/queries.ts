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

export function useSearchPosts(params: Record<string, string>) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "")),
  ).toString();
  return useQuery({
    queryKey: queryKeys.search(params),
    queryFn: () => get<FeedEntry[]>(`/api/posts${qs ? `?${qs}` : ""}`),
    // Old results stay visible while the next search loads — no flicker.
    placeholderData: keepPreviousData,
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
    refetchOnWindowFocus: true,
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
  kind: "reply" | "vote" | "accept";
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
