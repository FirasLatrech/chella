"use client";

import { AltArrowUpIcon, AltArrowDownIcon } from "@solar-icons/react/bold-duotone";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/format";
import { useInteractionSound } from "@/lib/sound";
import { votePost, ApiError } from "@/lib/mutations";
import { queryKeys } from "@/lib/queries";
import { invalidateEntryLists, patchEntryEverywhere } from "@/lib/cache";
import { registerVote, isChallenged, subscribeVoteGuard } from "@/lib/vote-guard";
import type { FeedEntry } from "./feed-item";

/*
 * Inline up/down vote on a card sitting inside a <Link> — preventDefault/
 * stopPropagation keep the click from also navigating into the post.
 * Same optimistic-cache shape as VotePill: patch every cached list this
 * entry appears in, then settle from the server response.
 */
export function UpvoteButton({
  postId,
  votes,
  myVote,
}: {
  postId: string;
  votes: number;
  myVote: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sound = useInteractionSound();
  const up = myVote === 1;
  const down = myVote === -1;
  const challenged = useSyncExternalStore(
    subscribeVoteGuard,
    isChallenged,
    () => false,
  );

  const mutation = useMutation({
    mutationFn: (direction: -1 | 0 | 1) => votePost(postId, direction),
    onMutate: async (direction) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feed });
      const previous = queryClient.getQueryData<FeedEntry[]>(queryKeys.feed);
      patchEntryEverywhere(queryClient, postId, (e) => ({
        ...e,
        votes: e.votes - (e.myVote ?? 0) + direction,
        myVote: direction,
      }));
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        const prev = context.previous.find((e) => e.id === postId);
        queryClient.setQueryData(queryKeys.feed, context.previous);
        if (prev) {
          patchEntryEverywhere(queryClient, postId, (e) => ({
            ...e,
            votes: prev.votes,
            myVote: prev.myVote ?? 0,
          }));
        }
      }
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
      }
    },
    onSettled: () => {
      invalidateEntryLists(queryClient, postId);
    },
  });

  function vote(direction: -1 | 1) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const isActive = direction === 1 ? up : down;
      // A no-op re-vote (toggling off) doesn't count toward the rate guard —
      // only casting a new vote does.
      if (!isActive && !registerVote()) return;
      mutation.mutate(isActive ? 0 : direction);
    };
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        {...sound}
        type="button"
        onClick={vote(1)}
        disabled={challenged}
        aria-label="Upvote"
        aria-pressed={up}
        className={cn(
          "grid size-7 cursor-pointer place-items-center rounded-xl transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-40",
          up
            ? "bg-brand/15 text-brand-content"
            : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <motion.span
          animate={up ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex"
        >
          <AltArrowUpIcon size={16} />
        </motion.span>
      </button>

      <span className="relative h-4 w-7 overflow-hidden text-center">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={votes}
            initial={{ y: up ? 10 : down ? -10 : 0, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: up ? -10 : down ? 10 : 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "absolute inset-0 text-xs font-medium tabular-nums",
              up
                ? "text-brand-content"
                : down
                  ? "text-destructive"
                  : "text-foreground",
            )}
          >
            {formatPoints(votes)}
          </motion.span>
        </AnimatePresence>
      </span>

      <button
        {...sound}
        type="button"
        onClick={vote(-1)}
        disabled={challenged}
        aria-label="Downvote"
        aria-pressed={down}
        className={cn(
          "grid size-7 cursor-pointer place-items-center rounded-xl transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-40",
          down
            ? "bg-destructive/15 text-destructive"
            : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <motion.span
          animate={down ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex"
        >
          <AltArrowDownIcon size={16} />
        </motion.span>
      </button>
    </div>
  );
}
