"use client";

import {
  AddCircleIcon,
  CloseCircleIcon,
  GalleryIcon,
} from "@solar-icons/react/bold-duotone";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RichEditor } from "@/components/ui/rich-editor";
import { OwnerMenu } from "./owner-menu";
import { useEntry } from "@/lib/queries";
import { invalidateEntryLists, removeEntryEverywhere } from "@/lib/cache";
import {
  ACCEPTED_IMAGE_TYPES,
  ApiError,
  deletePost,
  MAX_UPLOAD_BYTES,
  updatePost,
  uploadImage,
} from "@/lib/mutations";
import { blocksToDoc } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/content";

const MAX_TAGS = 3;
const POPULAR_TAGS = ["react", "nextjs", "go", "ai", "devops", "career"];

/*
 * Edit / delete for a post you wrote. Editing reuses the same RichEditor as
 * the composer, prefilled from the stored blocks, so a round-trip through
 * edit never flattens formatting.
 */
export function PostActions({
  postId,
  isAdmin = false,
}: {
  postId: string;
  /** Server-validated on the detail page, so admin controls don't wait for
   * a browser cache refresh after a role change. */
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: entry } = useEntry(postId);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [text, setText] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = useMutation({
    mutationFn: () =>
      updatePost(postId, {
        title: title.trim(), blocks, body: text, tags,
        ...(newImageUrl ? { imageUrl: newImageUrl } : {}),
      }),
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

  const canEdit = !!entry?.mine;
  const canDelete = canEdit || isAdmin;
  if (!entry || !canDelete) return null;

  function openEdit() {
    if (!entry) return;
    setTitle(entry.title);
    setTags(entry.tags);
    setBlocks(entry.blocks);
    setAddingTag(false);
    setCustomTag("");
    setNewImageUrl("");
    setError("");
    setEditing(true);
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < MAX_TAGS
          ? [...prev, tag]
          : prev,
    );
  }

  function commitCustomTag() {
    const tag = customTag.trim().toLowerCase().replace(/^#/, "").replace(/[^a-z0-9-]/g, "");
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) {
      setTags((prev) => [...prev, tag]);
    }
    setCustomTag("");
    setAddingTag(false);
  }

  async function addImage(file?: File) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That image is over 5 MB — pick a smaller one.");
      return;
    }
    setUploadingImage(true);
    setError("");
    try {
      setNewImageUrl(await uploadImage(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload image.");
    } finally {
      setUploadingImage(false);
    }
  }

  const previewImage = newImageUrl || entry?.image;

  return (
    <>
      <OwnerMenu
        what="post"
        onEdit={openEdit}
        onDelete={() => remove.mutate()}
        deleting={remove.isPending}
        canEdit={canEdit}
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

          <div className="bg-border-surface mx-3 h-px" />

          <div className="px-3 pt-3 pb-2">
            <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
              Tags
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {[...tags, ...POPULAR_TAGS.filter((t) => !tags.includes(t))].map((tag) => {
                const selected = tags.includes(tag);
                const atMax = !selected && tags.length >= MAX_TAGS;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    disabled={atMax}
                    className={cn(
                      "cursor-pointer rounded-full px-2 py-0.5 text-[11px] transition-colors",
                      selected
                        ? "bg-brand/10 text-brand-content ring-brand/25 font-medium ring-[0.5px]"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                      atMax && "cursor-not-allowed opacity-40",
                    )}
                  >
                    #{tag}
                  </button>
                );
              })}

              {addingTag ? (
                <span className="bg-secondary flex items-center rounded-full py-0.5 pr-2 pl-2 text-[11px]">
                  <span className="text-muted-foreground">#</span>
                  <input
                    autoFocus
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onBlur={commitCustomTag}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitCustomTag();
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setCustomTag("");
                        setAddingTag(false);
                      }
                    }}
                    size={8}
                    maxLength={20}
                    className="text-foreground w-16 bg-transparent outline-none"
                  />
                </span>
              ) : tags.length < MAX_TAGS ? (
                <button
                  type="button"
                  onClick={() => setAddingTag(true)}
                  className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors"
                >
                  <AddCircleIcon size={12} />
                  tag
                </button>
              ) : (
                <span className="text-muted-foreground/60 text-[10px] tabular-nums">
                  {tags.length}/{MAX_TAGS}
                </span>
              )}
            </div>
          </div>

          <div className="px-3 pb-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                Image
              </p>
              {newImageUrl ? (
                <span className="text-brand-content text-[11px]">New image ready</span>
              ) : null}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              className="hidden"
              disabled={uploadingImage}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addImage(file);
                e.target.value = "";
              }}
            />

            {previewImage ? (
              <div className="flex flex-wrap items-start gap-3">
                <div className="ring-border-surface-strong relative overflow-hidden rounded-lg ring-[0.5px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewImage}
                    alt="Post image preview"
                    className="max-h-36 w-auto"
                  />
                  {newImageUrl ? (
                    <button
                      type="button"
                      aria-label="Discard new image"
                      onClick={() => setNewImageUrl("")}
                      className="absolute top-1.5 right-1.5 cursor-pointer rounded-full bg-black/50 p-0.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                    >
                      <CloseCircleIcon size={16} />
                    </button>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadingImage}
                  onClick={() => fileRef.current?.click()}
                  className="gap-1.5"
                >
                  <GalleryIcon size={14} />
                  {uploadingImage ? "Uploading…" : "Replace image"}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploadingImage}
                onClick={() => fileRef.current?.click()}
                className="gap-1.5"
              >
                <GalleryIcon size={14} />
                {uploadingImage ? "Uploading…" : "Add image"}
              </Button>
            )}
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
              disabled={save.isPending || uploadingImage || !title.trim()}
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
