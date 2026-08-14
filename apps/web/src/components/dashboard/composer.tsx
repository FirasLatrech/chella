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
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { RichEditor } from "@/components/ui/rich-editor";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { playBounceSound, useInteractionSound } from "@/lib/sound";
import { uploadImage, ApiError } from "@/lib/mutations";
import { useMe, useProfile } from "@/lib/queries";
import type { FeedKind } from "./feed-item";
import type { ComposerDraft } from "./feed-section";

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

/*
 * Inline composer — expands in place instead of opening a modal. Collapsed it
 * is a single pill; clicking it (or a quick action) grows the same frame into
 * title + description + tags + image attach, so writing never leaves the feed.
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
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [restoredBody, setRestoredBody] = useState<string | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [customTag, setCustomTag] = useState("");

  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sound = useInteractionSound();

  const { data: me } = useMe();
  // Posting requires a filled-in profile (bio, link or CV) — the API
  // enforces this too; the gate here just explains it before the 403.
  const { data: myProfile } = useProfile(me?.handle);
  const profileComplete =
    !myProfile ||
    Boolean(
      myProfile.bio ||
        myProfile.github ||
        myProfile.linkedin ||
        myProfile.website ||
        myProfile.cvUrl,
    );
  const active = KINDS.find((k) => k.kind === kind) ?? KINDS[0];
  const valid = title.trim().length > 0;

  useEffect(() => {
    if (expanded) titleRef.current?.focus();
  }, [expanded]);

  // Restore a draft stashed by a 401 → login round-trip. Applied in a
  // microtask after hydration: no sync setState in the effect body, and the
  // server-rendered collapsed state hydrates cleanly first.
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem("chelaa:draft");
      if (raw) sessionStorage.removeItem("chelaa:draft");
    } catch {}
    if (!raw) return;
    const parsed = (() => {
      try {
        return JSON.parse(raw) as ComposerDraft;
      } catch {
        return null;
      }
    })();
    if (!parsed) return;
    queueMicrotask(() => {
      setKind(parsed.kind);
      setTitle(parsed.title);
      setBody(parsed.body);
      setTags(parsed.tags ?? []);
      setRestoredBody(parsed.body || undefined);
      setEditorKey((k) => k + 1);
      setExpanded(true);
    });
  }, []);

  function open(next: FeedKind) {
    setKind(next);
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

  function cancel() {
    discardImage();
    setTitle("");
    setBody("");
    setEditorKey((k) => k + 1);
    resetTags();
    setExpanded(false);
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
            try {
              sessionStorage.setItem(
                "chelaa:draft",
                JSON.stringify({ kind, title: title.trim(), body: body.trim(), tags }),
              );
            } catch {}
            router.push("/login?next=%2F");
            return;
          }
          throw err;
        }
      }
      const ok = await onPublish({
        kind,
        title: title.trim(),
        body: body.trim(),
        tags,
        imageUrl,
      });
      if (!ok) return;
      playBounceSound();
      discardImage();
      setTitle("");
      setBody("");
      setEditorKey((k) => k + 1);
      resetTags();
      setExpanded(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape") cancel();
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
                initialText={restoredBody}
                onTextChange={setBody}
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
              <Button size="sm" variant="ghost" onClick={cancel}>
                Cancel
              </Button>
              {me && !profileComplete ? (
                <Link
                  href={`/people/${me.handle}`}
                  className="text-brand-content bg-brand/10 hover:bg-brand/15 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                >
                  Complete your profile to post →
                </Link>
              ) : null}
              <Button
                size="sm"
                variant="brand"
                disabled={!valid || busy || !profileComplete}
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
