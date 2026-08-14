"use client";

import {
  CheckCircleIcon,
  AltArrowUpIcon,
} from "@solar-icons/react/bold-duotone";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { RichEditor } from "@/components/ui/rich-editor";
import { OwnerMenu } from "./owner-menu";
import { playBounceSound, useInteractionSound } from "@/lib/sound";
import {
  createReply,
  voteReply,
  acceptReply,
  updateReply,
  deleteReply,
  ApiError,
} from "@/lib/mutations";
import { useEntry, useMe, queryKeys } from "@/lib/queries";
import type { ContentEntry, Reply } from "@/lib/content";

/*
 * Answers (questions) or comments (posts/projects), fully API-backed via the
 * React Query entry cache. The question's author sees an Accept action on
 * unaccepted answers — the +20 moment.
 */
export function Discussion({ postId }: { postId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: entry } = useEntry(postId);
  const { data: me } = useMe();

  const [draft, setDraft] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  const kind = entry?.kind ?? "post";
  const replies = entry?.discussion ?? [];
  const canAccept =
    kind === "question" && !!me && me.handle === entry?.author;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.entry(postId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.feed });
  };

  const handle401 = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      router.push("/login");
      return true;
    }
    return false;
  };

  const publishMutation = useMutation({
    mutationFn: (text: string) => createReply(postId, text),
    onSuccess: () => {
      playBounceSound();
      setDraft("");
      setEditorKey((k) => k + 1);
      invalidate();
    },
    onError: handle401,
  });

  const acceptMutation = useMutation({
    mutationFn: (replyId: string) => acceptReply(replyId),
    onSuccess: invalidate,
    onError: handle401,
  });

  const noun = kind === "question" ? "answer" : "comment";
  const heading =
    replies.length === 0
      ? kind === "question"
        ? "No answers yet — be the first"
        : "No comments yet"
      : `${replies.length} ${noun}${replies.length === 1 ? "" : "s"}`;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-semibold tracking-tight">{heading}</h2>

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {replies.map((reply) => (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              <ReplyCard
                reply={reply}
                postId={postId}
                canAccept={canAccept && !reply.accepted}
                onAccept={() => acceptMutation.mutate(reply.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reply composer — same inset-frame language as the feed composer. */}
      <div
        className={cn(
          "bg-muted/60 mt-4 rounded-2xl p-1.5",
          "ring-border-surface-strong ring-[0.5px]",
        )}
      >
        <div className="bg-background ring-border-surface-strong focus-within:ring-ring/40 rounded-xl shadow-sm shadow-black/5 ring-[0.5px] transition-shadow focus-within:ring-1">
          <RichEditor
            key={editorKey}
            placeholder={
              kind === "question" ? "Write your answer…" : "Add a comment…"
            }
            onTextChange={setDraft}
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-1 pt-1.5 pb-0.5">
          <Button
            size="sm"
            variant="brand"
            disabled={!draft.trim() || publishMutation.isPending}
            onClick={() => publishMutation.mutate(draft.trim())}
          >
            {publishMutation.isPending
              ? "…"
              : kind === "question"
                ? "Post answer"
                : "Comment"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function ReplyCard({
  reply,
  postId,
  canAccept,
  onAccept,
}: {
  reply: Reply;
  postId: string;
  canAccept: boolean;
  onAccept: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reply.text);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.entry(postId) });

  const save = useMutation({
    mutationFn: () => updateReply(reply.id, draft.trim()),
    onSuccess: async () => {
      setEditing(false);
      await invalidate();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?next=/post/${postId}`);
      }
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteReply(reply.id),
    onSuccess: invalidate,
    onError: (e) => {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?next=/post/${postId}`);
      }
    },
  });

  return (
    <article
      className={cn(
        "rounded-xl p-4",
        reply.accepted
          ? "bg-emerald-500/5 ring-[0.5px] ring-emerald-500/30"
          : "bg-surface-primary ring-border-surface-strong ring-[0.5px]",
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar seed={reply.author} size="xs" />
        <span className="text-sm font-medium">@{reply.author}</span>
        <span className="text-muted-foreground/70 text-[11px]">
          {reply.time}
          {reply.edited ? " · edited" : ""}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {reply.accepted ? (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-500">
              <CheckCircleIcon size={14} />
              Accepted
            </span>
          ) : null}
          {canAccept ? (
            <button
              onClick={onAccept}
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
                "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-500",
              )}
            >
              <CheckCircleIcon size={13} />
              Accept
            </button>
          ) : null}
          <ReplyVote reply={reply} postId={postId} />
          {reply.mine ? (
            <OwnerMenu
              what="reply"
              onEdit={() => {
                setDraft(reply.text);
                setEditing(true);
              }}
              onDelete={() => remove.mutate()}
              deleting={remove.isPending}
            />
          ) : null}
        </span>
      </div>
      {editing ? (
        <div className="mt-2.5">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={save.isPending || !draft.trim()}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-foreground/90 mt-2.5 text-sm leading-relaxed text-pretty">
          {reply.text}
        </p>
      )}
    </article>
  );
}

/*
 * Upvote pill for an answer/comment — a button, not a link: rating never
 * navigates. Optimistic through the entry cache.
 */
function ReplyVote({ reply, postId }: { reply: Reply; postId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sound = useInteractionSound();
  const voted = reply.myVote ?? false;

  const mutation = useMutation({
    mutationFn: (up: boolean) => voteReply(reply.id, up),
    onMutate: async (up) => {
      const key = queryKeys.entry(postId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ContentEntry>(key);
      queryClient.setQueryData<ContentEntry>(key, (old) =>
        old
          ? {
              ...old,
              discussion: old.discussion.map((r) =>
                r.id === reply.id
                  ? { ...r, votes: r.votes + (up ? 1 : -1), myVote: up }
                  : r,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.entry(postId), context.previous);
      }
      if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entry(postId) });
    },
  });

  return (
    <motion.button
      {...sound}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        e.stopPropagation();
        mutation.mutate(!voted);
      }}
      aria-label="Upvote this reply"
      aria-pressed={voted}
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-xs tabular-nums transition-colors",
        voted
          ? "bg-brand/10 text-brand-content ring-brand/25 font-medium ring-[0.5px]"
          : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
      )}
    >
      <motion.span
        animate={voted ? { y: [0, -3, 0] } : { y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex"
      >
        <AltArrowUpIcon size={13} />
      </motion.span>
      {reply.votes}
    </motion.button>
  );
}
