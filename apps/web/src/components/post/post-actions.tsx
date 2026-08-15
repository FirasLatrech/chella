"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RichEditor } from "@/components/ui/rich-editor";
import { OwnerMenu } from "./owner-menu";
import { useEntry } from "@/lib/queries";
import { invalidateEntryLists, removeEntryEverywhere } from "@/lib/cache";
import { ApiError, deletePost, updatePost } from "@/lib/mutations";
import { blocksToDoc } from "@/lib/blocks";
import type { Block } from "@/lib/content";

const MAX_TAGS = 3;

/*
 * Edit / delete for a post you wrote. Editing reuses the same RichEditor as
 * the composer, prefilled from the stored blocks, so a round-trip through
 * edit never flattens formatting.
 */
export function PostActions({ postId }: { postId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: entry } = useEntry(postId);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [text, setText] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () =>
      updatePost(postId, { title: title.trim(), blocks, body: text, tags }),
    onSuccess: async () => {
      setEditing(false);
      invalidateEntryLists(queryClient, postId);
      router.refresh();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?next=/post/${postId}`);
        return;
      }
      setError(e instanceof ApiError ? e.message : "Couldn't save — try again.");
    },
  });

  const remove = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess: () => {
      // Drop it from the loaded pages immediately — invalidation alone would
      // leave the row on screen until the refetch lands.
      removeEntryEverywhere(queryClient, postId);
      invalidateEntryLists(queryClient);
      router.push("/");
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?next=/post/${postId}`);
      }
    },
  });

  if (!entry?.mine) return null;

  function openEdit() {
    if (!entry) return;
    setTitle(entry.title);
    setTags(entry.tags);
    setBlocks(entry.blocks);
    setTagInput("");
    setError("");
    setEditing(true);
  }

  function addTag() {
    const tag = tagInput.trim();
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return;
    setTags([...tags, tag]);
    setTagInput("");
  }

  return (
    <>
      <OwnerMenu
        what="post"
        onEdit={openEdit}
        onDelete={() => remove.mutate()}
        deleting={remove.isPending}
      />

      {/* Frame-inside-tint, same as the edit-profile modal. */}
      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        className="bg-muted/70 flex max-h-[calc(100dvh-2rem)] max-w-xl flex-col gap-0 rounded-2xl p-1.5 shadow-xl shadow-black/10"
      >
        <header className="shrink-0 px-2.5 pt-2 pb-2.5">
          <DialogTitle className="text-sm font-semibold tracking-tight">
            Edit post
          </DialogTitle>
        </header>

        <div className="bg-popover ring-border-surface-strong scroll-slim min-h-0 flex-1 overflow-y-auto rounded-xl ring-[0.5px]">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="border-0 bg-transparent font-medium focus:ring-0"
          />
          <div className="bg-border-surface mx-3 h-px" />
          <RichEditor
            placeholder="Add the details…"
            initialDoc={blocksToDoc(entry.blocks)}
            onTextChange={setText}
            onBlocksChange={setBlocks}
          />

          <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="bg-brand/10 text-brand-content hover:bg-brand/15 cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
              >
                {tag} ×
              </button>
            ))}
            {tags.length < MAX_TAGS ? (
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder="Add tag…"
                className="text-muted-foreground placeholder:text-muted-foreground/70 w-24 bg-transparent text-xs outline-none"
              />
            ) : null}
          </div>
        </div>

        <footer className="flex shrink-0 items-center gap-3 px-2.5 pt-2.5 pb-1">
          <span className="text-destructive min-w-0 flex-1 truncate text-xs">
            {error}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={save.isPending || !title.trim()}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </footer>
      </Dialog>
    </>
  );
}
