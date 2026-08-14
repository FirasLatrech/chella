"use client";

import { HeartIcon } from "@solar-icons/react/bold";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useInteractionSound } from "@/lib/sound";
import { votePost, ApiError } from "@/lib/mutations";
import { queryKeys } from "@/lib/queries";
import { patchEntryEverywhere } from "@/lib/cache";
import type { FeedEntry } from "@/components/dashboard/feed-item";

/*
 * Like chip on top of a linked card. preventDefault is the critical part:
 * a button inside an <a> still triggers navigation on click.
 *
 * The vote lands optimistically in the React Query feed cache, then the
 * server response settles it — so the count never flickers and every other
 * view of this entry (feed, questions, detail) sees the same number.
 */
export function VotePill({
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
  const liked = myVote === 1;

  const mutation = useMutation({
    mutationFn: (direction: 0 | 1) => votePost(postId, direction),
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
        queryClient.setQueryData(queryKeys.feed, context.previous);
      }
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });

  return (
    <motion.button
      {...sound}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mutation.mutate(liked ? 0 : 1);
      }}
      aria-label="Like this project"
      aria-pressed={liked}
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white tabular-nums",
        "backdrop-blur-md transition-colors duration-150",
        liked ? "bg-brand" : "bg-black/30 hover:bg-black/45",
      )}
    >
      <motion.span
        // Hearts pop, they don't hop.
        animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex"
      >
        <HeartIcon size={13} />
      </motion.span>
      {votes}
    </motion.button>
  );
}
