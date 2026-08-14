"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookmarkIcon } from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { ApiError, savePost } from "@/lib/mutations";
import { queryKeys } from "@/lib/keys";
import type { FeedEntry } from "@/components/dashboard/feed-item";

/*
 * Bookmark toggle. Optimistic: the icon flips instantly, every cached list
 * carrying this entry is patched, and the saved list refetches. Rendered
 * inside feed rows (which are <Link>s), so the click never bubbles into
 * navigation.
 */
export function SaveButton({
  id,
  saved,
  size = 15,
  className,
}: {
  id: string;
  saved: boolean;
  size?: number;
  className?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const patchLists = (next: boolean) => {
    const patch = (entries?: FeedEntry[]) =>
      entries?.map((e) => (e.id === id ? { ...e, saved: next } : e));
    queryClient.setQueryData<FeedEntry[]>(queryKeys.feed, patch);
    // Search results share the ["posts", params] key family.
    queryClient.setQueriesData<FeedEntry[]>({ queryKey: ["posts"] }, patch);
    queryClient.setQueryData<FeedEntry & object>(queryKeys.entry(id), (e) =>
      e ? { ...e, saved: next } : e,
    );
  };

  const mutation = useMutation({
    mutationFn: () => savePost(id),
    onMutate: () => patchLists(!saved),
    onSuccess: (res) => {
      patchLists(res.saved);
      queryClient.invalidateQueries({ queryKey: queryKeys.saved });
    },
    onError: (e) => {
      patchLists(saved);
      if (e instanceof ApiError && e.status === 401) router.push("/login");
    },
  });

  return (
    <button
      type="button"
      aria-label={saved ? "Remove bookmark" : "Save for later"}
      aria-pressed={saved}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        mutation.mutate();
      }}
      className={cn(
        "grid size-7 cursor-pointer place-items-center rounded-lg transition-colors",
        saved
          ? "text-brand-content hover:bg-brand/10"
          : "text-muted-foreground/60 hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <BookmarkIcon
        size={size}
        className={cn(!saved && "opacity-70")}
      />
    </button>
  );
}
