import type { QueryClient } from "@tanstack/react-query";
import type { FeedEntry } from "@/components/dashboard/feed-item";
import type { ContentEntry } from "@/lib/content";
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

/** "For you" wraps its rows alongside the interests they matched. */
type ForYouCache = { interests: string[]; items: FeedEntry[] };

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
  queryClient.setQueryData<FeedEntry[]>(queryKeys.saved, patchList);

  // "For you" — a third shape ({interests, items}); patching the flat and
  // paged lists alone would let a vote cast on a suggestion card revert.
  queryClient.setQueryData<ForYouCache>(
    queryKeys.forYou,
    (data) => data && { ...data, items: patchList(data.items) ?? data.items },
  );

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

  // The detail entry carries the same fields plus blocks/discussion, so it is
  // patched through its own type — narrowing it to FeedEntry would let a
  // future updater silently drop the body.
  queryClient.setQueryData<ContentEntry>(queryKeys.entry(id), (e) => {
    if (!e) return e;
    // ContentEntry's `replies` is an optional count while FeedEntry's is
    // required, so the entry is widened for the change and its own fields
    // are re-applied on top.
    const patched = change({ ...e, replies: e.replies ?? 0 });
    return { ...e, ...patched, replies: e.replies };
  });
}

/*
 * Refetch every list an entry can appear in. Mutations must call this rather
 * than invalidating `feed` alone: the ["infinite"] key is what actually
 * renders the feed, questions and projects lists, and it has no polling
 * interval of its own to paper over a missed invalidation.
 */
export function invalidateEntryLists(queryClient: QueryClient, id?: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.feed });
  queryClient.invalidateQueries({ queryKey: ["infinite"] });
  queryClient.invalidateQueries({ queryKey: queryKeys.saved });
  queryClient.invalidateQueries({ queryKey: queryKeys.forYou });
  // Creating or deleting a post moves the tab totals.
  queryClient.invalidateQueries({ queryKey: queryKeys.feedCounts });
  if (id) queryClient.invalidateQueries({ queryKey: queryKeys.entry(id) });
}

/** Drops an entry from every cached list — used after a delete. */
export function removeEntryEverywhere(queryClient: QueryClient, id: string) {
  const drop = (entries?: FeedEntry[]) => entries?.filter((e) => e.id !== id);

  queryClient.setQueryData<FeedEntry[]>(queryKeys.feed, drop);
  queryClient.setQueryData<FeedEntry[]>(queryKeys.saved, drop);
  queryClient.setQueryData<ForYouCache>(
    queryKeys.forYou,
    (data) => data && { ...data, items: drop(data.items) ?? data.items },
  );
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
