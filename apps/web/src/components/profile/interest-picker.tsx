"use client";

import { useMemo, useState } from "react";
import { CloseCircleIcon, AddCircleIcon } from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { useTags } from "@/lib/queries";

/** Mirrors the server's cap (maxInterests in profile.go). */
const MAX = 10;

/*
 * Interest picker — the tags driving "For you".
 *
 * Suggestions come from tags that exist on real posts, so a user picks a topic
 * the platform actually has content for rather than inventing one that matches
 * nothing. Free text is still allowed (a topic has to start somewhere), but
 * everything is lowercased to match how tags group everywhere else.
 */
export function InterestPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const { data: tags } = useTags();

  const chosen = useMemo(() => new Set(value), [value]);

  // Popular tags they haven't picked, narrowed by whatever they've typed.
  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return (tags ?? [])
      .filter((t) => !chosen.has(t.name) && (!q || t.name.includes(q)))
      .slice(0, 8);
  }, [tags, chosen, draft]);

  function add(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || chosen.has(tag) || value.length >= MAX) return;
    onChange([...value, tag]);
    setDraft("");
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  const full = value.length >= MAX;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Chosen interests. */}
      {value.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="bg-brand/10 text-brand-content ring-brand/20 flex items-center gap-1 rounded-lg py-1 pr-1 pl-2.5 text-xs font-medium ring-[0.5px]"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => remove(tag)}
                className="hover:text-foreground cursor-pointer opacity-60 transition-opacity hover:opacity-100"
              >
                <CloseCircleIcon size={14} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* Free-text entry — Enter commits, so it behaves like the tag input in
          the composer. */}
      <label className="group flex min-w-0 flex-col gap-1.5">
        <span
          className={cn(
            "border-input bg-background flex h-10 items-center gap-2 rounded-xl border px-3",
            "transition-all duration-150",
            "focus-within:border-ring focus-within:ring-ring/40 focus-within:ring-2",
            full && "opacity-60",
          )}
        >
          <AddCircleIcon
            size={16}
            className="text-muted-foreground group-focus-within:text-brand shrink-0 transition-colors duration-200"
          />
          <input
            value={draft}
            disabled={full}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // The picker lives inside the profile form — Enter must add a
                // tag, not submit and close the modal.
                e.preventDefault();
                add(draft);
              }
            }}
            placeholder={full ? `That's all ${MAX}` : "go, frontend, design…"}
            className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </span>
      </label>

      {/* Tags that actually exist, so picking beats typing. */}
      {!full && suggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {suggestions.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => add(t.name)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
            >
              {t.name}
              <span className="text-muted-foreground tabular-nums">
                {t.posts}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
