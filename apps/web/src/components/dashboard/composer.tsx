"use client";

import {
  QuestionCircleIcon,
  FolderWithFilesIcon,
  DocumentTextIcon,
  GalleryIcon,
  CloseCircleIcon,
  AddCircleIcon,
} from "@solar-icons/react/bold-duotone";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import type { JSONContent } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { RichEditor } from "@/components/ui/rich-editor";
import { Button } from "@/components/ui/button";
import { playBounceSound, useInteractionSound } from "@/lib/sound";
import { uploadImage, ApiError } from "@/lib/mutations";
import { useMe } from "@/lib/queries";
import { blocksToDoc } from "@/lib/blocks";
import {
  clearDraft,
  loadDraft,
  markResume,
  saveDraft,
  takeResume,
  type ComposerDraft,
} from "@/lib/draft";
import type { FeedKind } from "./feed-item";
import type { Block } from "@/lib/content";

const KINDS: {
  kind: FeedKind;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  checked: string;
  placeholder: string;
}[] = [
  {
    kind: "post",
    label: "Post",
    icon: DocumentTextIcon,
    checked:
      "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-500",
    placeholder: "What do you want to share?",
  },
  {
    kind: "question",
    label: "Question",
    icon: QuestionCircleIcon,
    checked: "bg-brand/10 text-brand-content ring-brand/25",
    placeholder: "What are you stuck on? Be specific.",
  },
  {
    kind: "project",
    label: "Project",
    icon: FolderWithFilesIcon,
    checked:
      "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-500",
    placeholder: "What did you build?",
  },
];

const POPULAR_TAGS = ["react", "nextjs", "go", "ai", "devops", "career"];
const MAX_TAGS = 3;

const AUTOSAVE_MS = 400;

/*
 * Inline composer — expands in place instead of opening a modal. Collapsed it
 * is a single pill; clicking it (or a quick action) grows the same frame into
 * title + description + tags + image attach, so writing never leaves the feed.
 *
 * Drafts autosave (lib/draft.ts, per user, localStorage) a beat after each
 * change. Closing the composer keeps the draft — the collapsed pill shows
 * "Draft · title" with a discard control — and publishing clears it. That
 * one store also carries writing across a 401 → login bounce; the only extra
 * step there is a session flag so the composer comes back open.
 */
export function Composer({
  onPublish,
}: {
  /** Returns true when the post was created (false e.g. redirected to login). */
  onPublish: (draft: ComposerDraft) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState<FeedKind>("post");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  // What the editor mounts with. It unmounts when the composer collapses, so
  // reopening (or restoring a draft) has to hand the content back in.
  const [mountDoc, setMountDoc] = useState<JSONContent | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [customTag, setCustomTag] = useState("");

  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sound = useInteractionSound();

  const { data: me } = useMe();
  const handle = me?.handle;
  const active = KINDS.find((k) => k.kind === kind) ?? KINDS[0];
  const valid = title.trim().length > 0;
  const hasDraft =
    title.trim().length > 0 || body.trim().length > 0 || tags.length > 0;

  useEffect(() => {
    if (expanded) titleRef.current?.focus();
  }, [expanded]);

  // Restore the saved draft once we know whose it is. Applied in a microtask
  // after hydration: no sync setState in the effect body, and the
  // server-rendered collapsed state hydrates cleanly first. It opens expanded
  // only when coming back from a login bounce; otherwise it waits in the pill.
  useEffect(() => {
    if (!handle) return;
    const saved = loadDraft(handle);
    if (!saved) return;
    const resume = takeResume();
    queueMicrotask(() => {
      setKind(saved.kind);
      setTitle(saved.title);
      setBody(saved.body);
      setBlocks(saved.blocks ?? []);
      setTags(saved.tags ?? []);
      setMountDoc(saved.blocks?.length ? blocksToDoc(saved.blocks) : undefined);
      setEditorKey((k) => k + 1);
      if (resume) setExpanded(true);
    });
  }, [handle]);

  // Autosave, debounced. Saving an empty draft removes it, so clearing the
  // fields also clears storage without a separate code path. The latest
  // draft is kept in a ref so unmounting (navigating to a post mid-sentence)
  // can flush what the debounce hadn't written yet.
  const latest = useRef<ComposerDraft | null>(null);
  useEffect(() => {
    if (!handle) return;
    const draft = { kind, title, body, blocks, tags };
    latest.current = draft;
    const timer = setTimeout(() => saveDraft(handle, draft), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [handle, kind, title, body, blocks, tags]);
  useEffect(() => {
    if (!handle) return;
    return () => {
      if (latest.current) saveDraft(handle, latest.current);
    };
  }, [handle]);

  function open(next: FeedKind) {
    setKind(next);
    if (!expanded) {
      // The editor is about to mount; give it back whatever is in the draft.
      setMountDoc(blocks.length ? blocksToDoc(blocks) : undefined);
      setEditorKey((k) => k + 1);
    }
    setExpanded(true);
  }

  function discardImage() {
    if (image) URL.revokeObjectURL(image);
    setImage(null);
    setImageFile(null);
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
    // Normalise: lowercase, strip leading #, collapse to url-safe characters.
    const tag = customTag.trim().toLowerCase().replace(/^#/, "").replace(/[^a-z0-9-]/g, "");
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) {
      setTags((prev) => [...prev, tag]);
    }
    setCustomTag("");
    setAddingTag(false);
  }

  function resetTags() {
    setTags([]);
    setCustomTag("");
    setAddingTag(false);
  }

  // Clears everything — fields, attachment and the stored draft.
  function discard() {
    discardImage();
    setTitle("");
    setBody("");
    setBlocks([]);
    setMountDoc(undefined);
    setEditorKey((k) => k + 1);
    resetTags();
    if (handle) clearDraft(handle);
  }

  // Closing keeps the draft: it is autosaved and the pill says so. Discarding
  // is a deliberate, separate action on the pill.
  function close() {
    setAddingTag(false);
    setCustomTag("");
    setExpanded(false);
  }

  // Before leaving for login, make sure the very latest keystrokes are in
  // storage (the debounce may not have fired) and flag the return trip.
  function stashForLogin() {
    if (handle) saveDraft(handle, { kind, title, body, blocks, tags });
    markResume();
    router.push("/login?next=%2F");
  }

  async function publish() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      // Attachment goes to storage (R2) first; its public URL rides along
      // with the post.
      let imageUrl: string | undefined;
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            stashForLogin();
            return;
          }
          throw err;
        }
      }
      const ok = await onPublish({
        kind,
        title: title.trim(),
        body: body.trim(),
        blocks,
        tags,
        imageUrl,
      });
      if (!ok) {
        // FeedSection already sent us to login; keep the writing for the
        // way back.
        if (handle) saveDraft(handle, { kind, title, body, blocks, tags });
        markResume();
        return;
      }
      playBounceSound();
      discard();
      setExpanded(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
      className={cn(
        "bg-muted/60 rounded-2xl p-1.5",
        "ring-border-surface-strong ring-[0.5px]",
      )}
    >
      {/* White inset panel — pill when collapsed, editor when expanded. */}
      <div
        className={cn(
          "bg-background ring-border-surface-strong rounded-xl shadow-sm shadow-black/5 ring-[0.5px]",
          "transition-shadow",
          expanded && "focus-within:ring-ring/40 focus-within:ring-1",
        )}
      >
        <div className="flex items-center gap-2.5 py-2 pr-2 pl-3">
          <Avatar seed={me?.handle ?? "chelaa"} size="sm" />
          {expanded ? (
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={active.placeholder}
              maxLength={120}
              className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
            />
          ) : hasDraft ? (
            <>
              <button
                {...sound}
                onClick={() => open(kind)}
                className="flex min-w-0 flex-1 cursor-text items-center gap-2 bg-transparent text-left text-sm"
              >
                <span className="bg-brand/10 text-brand-content ring-brand/25 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-[0.5px]">
                  Draft
                </span>
                <span className="text-foreground min-w-0 truncate">
                  {title.trim() || body.trim().slice(0, 80)}
                </span>
              </button>
              <Button
                iconOnly
                size="sm"
                variant="ghost"
                aria-label="Discard draft"
                onClick={discard}
                className="text-muted-foreground"
              >
                <CloseCircleIcon size={16} />
              </Button>
            </>
          ) : (
            <button
              {...sound}
              onClick={() => open("post")}
              className="text-muted-foreground min-w-0 flex-1 cursor-text truncate bg-transparent text-left text-sm"
            >
              Share something with the community…
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="bg-border-surface mx-3 h-px" />
              {/* Remounted via key on reset so the editor clears cleanly. */}
              <RichEditor
                key={editorKey}
                placeholder="Add the details — context, code, links…"
                initialDoc={mountDoc}
                onTextChange={setBody}
                onBlocksChange={setBlocks}
              />

              {/* Tags — selected first, then popular suggestions, then a
                  custom entry that opens in place. */}
              <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3">
                {[...tags, ...POPULAR_TAGS.filter((t) => !tags.includes(t))].map(
                  (tag) => {
                    const selected = tags.includes(tag);
                    const atMax = !selected && tags.length >= MAX_TAGS;
                    return (
                      <button
                        key={tag}
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
                  },
                )}

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
                          // Close only the tag input, not the composer.
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

              {image ? (
                <div className="px-3 pb-3">
                  <div className="ring-border-surface-strong relative inline-block overflow-hidden rounded-lg ring-[0.5px]">
                    {/* Object URLs can't go through next/image. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt="Attachment preview"
                      className="max-h-40 w-auto"
                    />
                    <button
                      onClick={discardImage}
                      aria-label="Remove image"
                      className="absolute top-1.5 right-1.5 cursor-pointer rounded-full bg-black/50 p-0.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                    >
                      <CloseCircleIcon size={16} />
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Action row on the tint. */}
      <div className="flex items-center gap-1 px-1 pt-1.5 pb-0.5">
        {KINDS.map((k) => {
          const Icon = k.icon;
          const checked = expanded && k.kind === kind;
          return (
            <button
              key={k.kind}
              {...sound}
              onClick={() => open(k.kind)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors",
                checked
                  ? cn("font-medium ring-[0.5px]", k.checked)
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
              )}
            >
              <Icon size={14} />
              {k.label}
            </button>
          );
        })}

        <AnimatePresence>
          {expanded ? (
            <motion.div
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.15 }}
              className="ml-auto flex items-center gap-1"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    discardImage();
                    setImage(URL.createObjectURL(file));
                    setImageFile(file);
                  }
                  e.target.value = "";
                }}
              />
              <Button
                iconOnly
                size="sm"
                variant="ghost"
                aria-label="Attach image"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "text-muted-foreground",
                  image && "text-brand",
                )}
              >
                <GalleryIcon size={16} />
              </Button>
              <Button size="sm" variant="ghost" onClick={close}>
                Close
              </Button>
              <Button
                size="sm"
                variant="brand"
                disabled={!valid || busy}
                onClick={publish}
              >
                {busy ? "…" : "Publish"}
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
