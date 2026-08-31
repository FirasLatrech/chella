"use client";

import { PenNewSquareIcon } from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { openEditProfile } from "@/lib/edit-profile";

/*
 * Opens the profile editor, which is mounted once in the Shell. A plain
 * button rather than a link to `?edit=1` — editing shouldn't cost you your
 * place on whatever page you're on.
 */
export function EditProfileButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openEditProfile}
      className={cn(
        "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        "mt-1 flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1",
        "text-xs font-medium transition-colors",
        className,
      )}
    >
      <PenNewSquareIcon size={13} className="text-muted-foreground" />
      Edit profile
    </button>
  );
}
