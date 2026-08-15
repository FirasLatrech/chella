"use client";

import {
  AltArrowUpIcon,
  AltArrowDownIcon,
  DoubleAltArrowUpIcon,
  DoubleAltArrowDownIcon,
} from "@solar-icons/react/bold-duotone";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useInteractionSound } from "@/lib/sound";
import { votePost, ApiError } from "@/lib/mutations";
import { useEntry, queryKeys } from "@/lib/queries";
import { invalidateEntryLists, patchEntryEverywhere } from "@/lib/cache";
import type { ContentEntry } from "@/lib/content";

/*
 * Voting on the detail page, wired to the API through the React Query entry
 * cache: the vote lands optimistically, the server settles it, and a 401
 * routes to /login with the optimistic change rolled back.
 */
export function VoteColumn({ postId }: { postId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sound = useInteractionSound();
  const { data: entry } = useEntry(postId);

  const votes = entry?.votes ?? 0;
  const myVote = entry?.myVote ?? 0;

  const mutation = useMutation({
    mutationFn: (direction: -1 | 0 | 1) => votePost(postId, direction),
    onMutate: async (direction) => {
      const key = queryKeys.entry(postId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ContentEntry>(key);
      // Patch every cache this post appears in, not just the detail entry —
      // otherwise the feed row behind you keeps the stale count.
      patchEntryEverywhere(queryClient, postId, (e) => ({
        ...e,
        votes: e.votes - (e.myVote ?? 0) + direction,
        myVote: direction,
      }));
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        const prev = context.previous;
        queryClient.setQueryData(queryKeys.entry(postId), prev);
        // Roll the lists back to the same snapshot.
        patchEntryEverywhere(queryClient, postId, (e) => ({
          ...e,
          votes: prev.votes,
          myVote: prev.myVote ?? 0,
        }));
      }
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
      }
    },
    onSettled: () => invalidateEntryLists(queryClient, postId),
  });

  function cast(next: -1 | 1) {
    mutation.mutate(myVote === next ? 0 : next);
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <VoteButton
        direction={1}
        active={myVote === 1}
        onCast={() => cast(1)}
        sound={sound}
      />

      <div className="relative h-5 w-10 overflow-hidden text-center">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={votes}
            initial={{ y: myVote >= 0 ? 12 : -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: myVote >= 0 ? -12 : 12, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "absolute inset-0 text-sm font-semibold tabular-nums",
              myVote === 1 && "text-brand-content",
              myVote === -1 && "text-destructive",
            )}
          >
            {votes}
          </motion.span>
        </AnimatePresence>
      </div>

      <VoteButton
        direction={-1}
        active={myVote === -1}
        onCast={() => cast(-1)}
        sound={sound}
      />
    </div>
  );
}

function VoteButton({
  direction,
  active,
  onCast,
  sound,
}: {
  direction: 1 | -1;
  active: boolean;
  onCast: () => void;
  sound: Record<string, () => void>;
}) {
  const up = direction === 1;
  const Idle = up ? AltArrowUpIcon : AltArrowDownIcon;
  const Active = up ? DoubleAltArrowUpIcon : DoubleAltArrowDownIcon;

  return (
    <motion.button
      {...sound}
      onClick={onCast}
      whileTap={{ scale: 0.85 }}
      aria-label={up ? "Upvote" : "Downvote"}
      aria-pressed={active}
      className={cn(
        "relative grid size-8 cursor-pointer place-items-center rounded-lg transition-colors",
        active
          ? up
            ? "bg-brand/10 text-brand-content"
            : "bg-destructive/10 text-destructive"
          : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
      )}
    >
      {/* One-shot burst ring when the vote lands. */}
      <AnimatePresence>
        {active ? (
          <motion.span
            key="burst"
            initial={{ scale: 0.4, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className={cn(
              "pointer-events-none absolute inset-0 rounded-lg ring-2",
              up ? "ring-brand/60" : "ring-destructive/50",
            )}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={active ? "active" : "idle"}
          initial={{ y: up ? 8 : -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: up ? -8 : 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 30 }}
          className="flex"
        >
          {active ? <Active size={18} /> : <Idle size={18} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
