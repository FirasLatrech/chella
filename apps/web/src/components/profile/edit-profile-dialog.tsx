"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { ComponentType } from "react";
import {
  CloseCircleIcon,
  CodeSquareIcon,
  GlobalIcon,
  UserCircleIcon,
  CloudUploadIcon,
  DocumentTextIcon,
  PenNewSquareIcon,
  TrashBinTrashIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { MediaTrigger } from "@/components/ui/media-viewer";
import { Textarea } from "@/components/ui/input";
import {
  ApiError,
  updateProfile,
  uploadFile,
  type ProfileDetailsInput,
} from "@/lib/mutations";
import { queryKeys } from "@/lib/keys";

/** Small caps heading that groups related fields inside the modal. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
      {children}
    </span>
  );
}

/*
 * Profile editing lives in a modal on the profile page itself — no context
 * switch to a settings route. The CV uploads immediately on pick; everything
 * else persists on Save, then the modal closes over the refreshed profile.
 */
export function EditProfileDialog({
  handle,
  initial,
}: {
  handle: string;
  initial: ProfileDetailsInput;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // ?edit=1 opens the modal directly — the onboarding checklist links here,
  // and landing on the profile with nothing open would strand the user.
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(() => searchParams.get("edit") === "1");
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const set = (key: TextKey) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  function openDialog() {
    // Re-seed from the latest server data every time the modal opens.
    setForm(initial);
    setError("");
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    // Drop ?edit=1 so a refresh (or Back) doesn't reopen the modal.
    if (searchParams.get("edit")) {
      router.replace(`/people/${handle}`, { scroll: false });
    }
  }

  async function pickCv(file: File | undefined) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadFile(file);
      set("cvUrl")(url);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?next=/people/${handle}`);
        return;
      }
      setError(e instanceof ApiError ? e.message : "Upload failed — try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    setError("");
    setAvatarUploading(true);
    try {
      set("avatar")(await uploadFile(file));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?next=/people/${handle}`);
        return;
      }
      setError(e instanceof ApiError ? e.message : "Upload failed — try again.");
    } finally {
      setAvatarUploading(false);
      if (avatarRef.current) avatarRef.current.value = "";
    }
  }

  async function save() {
    setError("");
    setSaving(true);
    try {
      await updateProfile(form);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(handle) });
      setOpen(false);
      // Server-rendered profile page picks up the new details behind the
      // closing modal — the updated card is the confirmation.
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?next=/people/${handle}`);
        return;
      }
      setError(e instanceof ApiError ? e.message : "Save failed — try again.");
    } finally {
      setSaving(false);
    }
  }

  // Text fields only — emailNotifications is a boolean and has its own control.
  type TextKey = "bio" | "github" | "linkedin" | "website" | "cvUrl" | "avatar";

  /*
   * Same field treatment as the auth pages: a leading icon inside the
   * control, and a focus ring on the wrapper so the icon tints with it.
   */
  const field = (
    label: string,
    key: TextKey,
    placeholder: string,
    Icon: ComponentType<{ size?: number; className?: string }>,
  ) => (
    <label className="group flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      <span
        className={cn(
          "border-input bg-background flex h-10 items-center gap-2 rounded-xl border px-3",
          "transition-all duration-150",
          "focus-within:border-ring focus-within:ring-ring/40 focus-within:ring-2",
        )}
      >
        <Icon
          size={16}
          className="text-muted-foreground group-focus-within:text-brand shrink-0 transition-colors duration-200"
        />
        <input
          value={form[key]}
          onChange={(e) => set(key)(e.target.value)}
          placeholder={placeholder}
          className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </span>
    </label>
  );

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 mt-1 flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
      >
        <PenNewSquareIcon size={13} className="text-muted-foreground" />
        Edit profile
      </button>

      {/* Frame-inside-tint, same relationship as the notifications panel and
          Card: tinted shell, inset scrolling body, footer on the tint. */}
      <Dialog
        open={open}
        onClose={closeDialog}
        className="bg-muted/70 flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col gap-0 rounded-2xl p-1.5 shadow-xl shadow-black/10"
      >
        <header className="flex shrink-0 items-start gap-2 px-2.5 pt-2 pb-2.5">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm font-semibold tracking-tight">
              Edit profile
            </DialogTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">
              This is how you show up across Chela.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={closeDialog}
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 -mt-0.5 grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors"
          >
            <CloseCircleIcon size={17} />
          </button>
        </header>

        {/* Inset panel — the fields scroll inside it, the footer never moves. */}
        <div className="bg-popover ring-border-surface-strong scroll-slim min-h-0 flex-1 overflow-y-auto rounded-xl p-5 shadow-sm shadow-black/5 ring-[0.5px]">
          <div className="flex flex-col gap-6">
            {/* Avatar — uploads immediately, like the CV. Without one the
                generated sky crop stands in, so this is never required. */}
            <div className="flex items-center gap-3.5">
              <Avatar
                seed={handle}
                src={form.avatar || undefined}
                size="xl"
                className="size-16"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={avatarUploading}
                    onClick={() => avatarRef.current?.click()}
                  >
                    <CloudUploadIcon size={15} />
                    {avatarUploading
                      ? "Uploading…"
                      : form.avatar
                        ? "Change photo"
                        : "Upload photo"}
                  </Button>
                  {form.avatar ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => set("avatar")("")}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  PNG, JPEG, WebP or GIF, up to 5 MB.
                </p>
              </div>
              <input
                ref={avatarRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => pickAvatar(e.target.files?.[0])}
              />
            </div>

            <section className="flex flex-col gap-3">
              <SectionLabel>About you</SectionLabel>
              <label className="block">
              <Textarea
                value={form.bio}
                onChange={(e) => set("bio")(e.target.value)}
                placeholder="Backend engineer in Tunis. Go, Postgres, and too many side projects."
                rows={3}
                maxLength={500}
              />
              <span className="text-muted-foreground/70 mt-1 block text-right text-[11px] tabular-nums">
                {form.bio.length}/500
              </span>
              </label>
            </section>

            <section className="flex flex-col gap-3">
              <SectionLabel>Links</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {field("GitHub", "github", "github.com/you", CodeSquareIcon)}
                {field(
                  "LinkedIn",
                  "linkedin",
                  "linkedin.com/in/you",
                  UserCircleIcon,
                )}
              </div>
              {field("Website", "website", "you.tn", GlobalIcon)}
            </section>

            {/* CV — a PDF stored on our own uploader. */}
            <section className="flex flex-col gap-3">
              <SectionLabel>CV</SectionLabel>
              <div>
              {form.cvUrl ? (
                <div className="bg-muted/60 ring-border-surface-strong flex items-center gap-2 rounded-xl px-3 py-2 ring-[0.5px]">
                  <DocumentTextIcon
                    size={16}
                    className="text-brand-content shrink-0"
                  />
                  <MediaTrigger
                    src={form.cvUrl}
                    label="View CV"
                    className="text-brand-content min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline"
                  >
                    View uploaded CV
                  </MediaTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label="Remove CV"
                    onClick={() => set("cvUrl")("")}
                  >
                    <TrashBinTrashIcon size={15} />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="md"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <CloudUploadIcon size={16} />
                  {uploading ? "Uploading…" : "Upload CV (PDF, up to 5 MB)"}
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => pickCv(e.target.files?.[0])}
              />
              </div>
            </section>

            {/* Email notifications — on by default; this is the opt-out. */}
            <section className="border-border-surface flex flex-col gap-3 border-t-[0.5px] pt-5">
              <SectionLabel>Notifications</SectionLabel>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.emailNotifications !== false}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      emailNotifications: e.target.checked,
                    }))
                  }
                  className="accent-brand size-4 cursor-pointer"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium">
                    Email me about activity
                  </span>
                  <span className="text-muted-foreground block text-[11px]">
                    Replies, upvotes and accepted answers.
                  </span>
                </span>
              </label>
            </section>
          </div>
        </div>

        {/* Footer sits on the tint, outside the inset — same as the
            notifications panel's "See all" row. */}
        <footer className="flex shrink-0 items-center gap-3 px-2.5 pt-2.5 pb-1">
          <span className="text-destructive min-w-0 flex-1 truncate text-xs">
            {error}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={saving || uploading || avatarUploading || !dirty}
              onClick={save}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </footer>
      </Dialog>
    </>
  );
}
