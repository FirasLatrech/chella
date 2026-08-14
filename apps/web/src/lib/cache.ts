import type { QueryClient } from "@tanstack/react-query";
import type { FeedEntry } from "@/components/dashboard/feed-item";
import type { PostPage } from "@/lib/queries";
import { queryKeys } from "@/lib/keys";

/*
 * Optimistic cache updates for a single entry.
 *
 * The same post lives in several caches with two different shapes: flat
 * arrays (feed, search) and paged infinite queries ({pages: [{items}]}).
 * Every optimistic updater must patch both, or a vote cast in the feed
 * silently reverts when the virtual list re-renders from its own cache.
 * Centralised here so a new list can't forget one.
 */

type InfiniteFeed = { pages: PostPage[]; pageParams: unknown[] };

/** Applies `change` to the entry with `id` everywhere it is cached. */
export function patchEntryEverywhere(
  queryClient: QueryClient,
  id: string,
  change: (entry: FeedEntry) => FeedEntry,
) {
  const patchList = (entries?: FeedEntry[]) =>
    entries?.map((e) => (e.id === id ? change(e) : e));

  // Flat lists.
  queryClient.setQueryData<FeedEntry[]>(queryKeys.feed, patchList);
  queryClient.setQueriesData<FeedEntry[]>({ queryKey: ["posts"] }, patchList);
  queryClient.setQueryData<FeedEntry[]>(queryKeys.saved, patchList);

  // Paged lists.
  queryClient.setQueriesData<InfiniteFeed>(
    { queryKey: ["infinite"] },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((e) => (e.id === id ? change(e) : e)),
        })),
      },
  );

  // The detail entry carries the same fields.
  queryClient.setQueryData<FeedEntry>(queryKeys.entry(id), (e) =>
    e ? change(e) : e,
  );
}

/** Drops an entry from every cached list — used after a delete. */
export function removeEntryEverywhere(queryClient: QueryClient, id: string) {
  const drop = (entries?: FeedEntry[]) => entries?.filter((e) => e.id !== id);

  queryClient.setQueryData<FeedEntry[]>(queryKeys.feed, drop);
  queryClient.setQueriesData<FeedEntry[]>({ queryKey: ["posts"] }, drop);
  queryClient.setQueryData<FeedEntry[]>(queryKeys.saved, drop);
  queryClient.setQueriesData<InfiniteFeed>(
    { queryKey: ["infinite"] },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.filter((e) => e.id !== id),
        })),
      },
  );
}
