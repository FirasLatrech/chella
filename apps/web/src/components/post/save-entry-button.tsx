"use client";

import { useEntry } from "@/lib/queries";
import { SaveButton } from "./save-button";

/** Detail-page bookmark — reads its state from the entry cache so it stays
 *  in sync with the feed's buttons and survives the 10s poll. */
export function SaveEntryButton({ postId }: { postId: string }) {
  const { data: entry } = useEntry(postId);
  if (!entry) return null;
  return (
    <SaveButton
      id={postId}
      saved={entry.saved ?? false}
      size={18}
      className="size-9 rounded-xl"
    />
  );
}
