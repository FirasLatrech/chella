"use client";

import { useEffect, useRef, useState } from "react";
import { LinkIcon, CheckCircleIcon } from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { useInteractionSound } from "@/lib/sound";

/*
 * Copy a post's permalink.
 *
 * Rendered inside feed cards, which are <Link>s — the click must be stopped
 * or copying would also navigate to the post.
 *
 * The tooltip doubles as the confirmation: it flips to "Copied" for a moment
 * instead of firing a toast, so the feedback appears exactly where the user
 * is already looking.
 */
export function CopyLinkButton({
  id,
  size = 15,
  className,
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Spread onto the button — fires the shared click sound on press.
  const sound = useInteractionSound();

  // Don't leave a timer running against an unmounted card — the feed is
  // virtualized, so rows unmount while the timeout is still pending.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy(event: React.MouseEvent) {
    // The card is a link; copying must not navigate.
    event.preventDefault();
    event.stopPropagation();

    const url = `${window.location.origin}/post/${id}`;
    try {
      // navigator.clipboard is undefined on insecure origins and can reject
      // when the document isn't focused — fall back rather than doing nothing.
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        legacyCopy(url);
      }
      setFailed(false);
      setCopied(true);
    } catch {
      try {
        legacyCopy(url);
        setFailed(false);
        setCopied(true);
      } catch {
        // Say so rather than silently doing nothing.
        setFailed(true);
        setCopied(true);
      }
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  const label = failed ? "Press ⌘C to copy" : copied ? "Copied" : "Copy link";

  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={copy}
        {...sound}
        className={cn(
          "grid size-7 cursor-pointer place-items-center rounded-lg transition-colors",
          copied && !failed
            ? "text-emerald-600 dark:text-emerald-500"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
          className,
        )}
      >
        {copied && !failed ? (
          <CheckCircleIcon size={size} />
        ) : (
          <LinkIcon size={size} />
        )}
      </button>
    </Tooltip>
  );
}

/** Fallback for insecure origins, where navigator.clipboard doesn't exist. */
function legacyCopy(text: string) {
  const el = document.createElement("textarea");
  el.value = text;
  // Keep it off-screen and unfocusable-looking, but still selectable.
  el.setAttribute("readonly", "");
  el.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
  document.body.appendChild(el);
  el.select();
  try {
    if (!document.execCommand("copy")) throw new Error("copy rejected");
  } finally {
    el.remove();
  }
}
