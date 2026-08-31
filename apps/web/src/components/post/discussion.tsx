"use client";

import {
  CheckCircleIcon,
  AltArrowUpIcon,
  ReplyIcon,
} from "@solar-icons/react/bold-duotone";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { RichEditor } from "@/components/ui/rich-editor";
import { Tabs, TabItem, TabGroup } from "@/components/ui/tabs";
import { OwnerMenu } from "./owner-menu";
import { invalidateEntryLists } from "@/lib/cache";
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

type ReplySort = "top" | "new" | "old";
const SORTS: { key: ReplySort; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "new", label: "Newest" },
  { key: "old", label: "Oldest" },
];

const byAge = (a: Reply, b: Reply) =>
  a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;

interface Thread {
  root: Reply;
  children: Reply[];
}

/*
 * Answers (questions) or comments (posts/projects), fully API-backed via the
 * React Query entry cache. The question's author sees an Accept action on
 * unaccepted answers — the +20 moment.
 *
 * Threading is ONE level: a top-level reply can carry a conversation under
 * it, and that is as deep as it goes (the API re-parents anything deeper to
 * the root). Roots sort by Top / Newest / Oldest — the accepted answer stays
 * pinned first regardless — while the replies inside a thread always read in
 * conversation order, oldest first. Sorting happens here, not on the server:
 * a post's discussion is fetched whole, so there is nothing to page.
 */
export function Discussion({ postId }: { postId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: entry } = useEntry(postId);
  const { data: me } = useMe();

  const [draft, setDraft] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const kind = entry?.kind ?? "post";
  const replies = entry?.discussion;
  // Questions default to Top — the best answer should lead — while comment
  // threads read as a conversation, oldest first.
  const [sort, setSort] = useState<ReplySort>(
    kind === "question" ? "top" : "old",
  );
  const canAccept =
    kind === "question" && !!me && me.handle === entry?.author;

  const threads = useMemo<Thread[]>(() => {
    const all = replies ?? [];
    const roots = all.filter((r) => !r.parentId);
    const childrenOf = new Map<string, Reply[]>();
    for (const r of all) {
      if (!r.parentId) continue;
      const list = childrenOf.get(r.parentId) ?? [];
      list.push(r);
      childrenOf.set(r.parentId, list);
    }
    const compare = (a: Reply, b: Reply) => {
      // Accepted first, always — the sort chooses the order of the rest.
      if (!!a.accepted !== !!b.accepted) return a.accepted ? -1 : 1;
      switch (sort) {
        case "top":
          return b.votes - a.votes || byAge(a, b);
        case "new":
          return byAge(b, a);
        default:
          return byAge(a, b);
      }
    };
    return roots
      .slice()
      .sort(compare)
      .map((root) => ({
        root,
        children: (childrenOf.get(root.id) ?? []).slice().sort(byAge),
      }));
  }, [replies, sort]);

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

  const threadMutation = useMutation({
    mutationFn: ({ parentId, text }: { parentId: string; text: string }) =>
      createReply(postId, text, parentId),
    onSuccess: () => {
      playBounceSound();
      setReplyingTo(null);
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
  const count = threads.length;
  const heading =
    count === 0
      ? kind === "question"
        ? "No answers yet — be the first"
        : "No comments yet"
      : `${count} ${noun}${count === 1 ? "" : "s"}`;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">{heading}</h2>
        {count > 1 ? (
          <TabGroup
            selectedIndex={SORTS.findIndex((s) => s.key === sort)}
            onChange={(i) => setSort(SORTS[i].key)}
          >
            <Tabs>
              {SORTS.map((s) => (
                <TabItem key={s.key}>{s.label}</TabItem>
              ))}
            </Tabs>
          </TabGroup>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {threads.map(({ root, children }) => (
            <motion.div
              key={root.id}
              layout="position"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              <ReplyCard
                reply={root}
                postId={postId}
                canAccept={canAccept && !root.accepted}
                onAccept={() => acceptMutation.mutate(root.id)}
                onReply={() => setReplyingTo(root.id)}
              />

              {children.length > 0 || replyingTo === root.id ? (
                // The thread hangs off its root on a hairline — indented
                // enough to read as "inside", not so much that it looks like a
                // second column.
                <div className="border-border-surface-strong mt-2 ml-5 flex flex-col gap-2 border-l pl-3 md:ml-7 md:pl-4">
                  {children.map((child) => (
                    <ReplyCard
                      key={child.id}
                      reply={child}
                      postId={postId}
                      nested
                      canAccept={false}
                      onAccept={() => {}}
                      onReply={() => setReplyingTo(root.id)}
                    />
                  ))}
                  {replyingTo === root.id ? (
                    <ThreadComposer
                      to={root.author}
                      pending={threadMutation.isPending}
                      onCancel={() => setReplyingTo(null)}
                      onSubmit={(text) =>
                        threadMutation.mutate({ parentId: root.id, text })
                      }
                    />
                  ) : null}
                </div>
              ) : null}
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

/*
 * Inline composer for a thread — plain text like every reply, opens in place
 * under the root it answers. ⌘/Ctrl+Enter sends, Escape closes.
 */
function ThreadComposer({
  to,
  pending,
  onCancel,
  onSubmit,
}: {
  to: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const valid = text.trim().length > 0;
  const send = () => {
    if (valid && !pending) onSubmit(text.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="bg-surface-primary ring-border-surface-strong rounded-xl p-2 ring-[0.5px]"
    >
      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
        }}
        rows={2}
        className="min-h-16"
        placeholder={`Reply to @${to}…`}
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="brand"
          size="sm"
          disabled={!valid || pending}
          onClick={send}
        >
          {pending ? "…" : "Reply"}
        </Button>
      </div>
    </motion.div>
  );
}

function ReplyCard({
  reply,
  postId,
  canAccept,
  onAccept,
  onReply,
  nested = false,
}: {
  reply: Reply;
  postId: string;
  canAccept: boolean;
  onAccept: () => void;
  /** Opens the thread composer under this card's root. */
  onReply: () => void;
  /** Rendered inside a thread — a touch more compact than a root. */
  nested?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reply.text);

  const invalidate = () => invalidateEntryLists(queryClient, postId);

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
        "rounded-xl",
        nested ? "p-3" : "p-4",
        reply.accepted
          ? "bg-emerald-500/5 ring-[0.5px] ring-emerald-500/30"
          : "bg-surface-primary ring-border-surface-strong ring-[0.5px]",
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar seed={reply.author} src={reply.avatar} size="xs" />
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
          <button
            onClick={onReply}
            aria-label={`Reply to @${reply.author}`}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
            )}
          >
            <ReplyIcon size={13} />
            Reply
          </button>
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
