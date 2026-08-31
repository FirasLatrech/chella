"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { ComponentType } from "react";
import {
  CloseCircleIcon,
  CodeSquareIcon,
  GlobalIcon,
  UserCircleIcon,
  CloudUploadIcon,
  DocumentTextIcon,
  TrashBinTrashIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabItem, TabGroup, TabPanels, TabPanel } from "@/components/ui/tabs";
import { MediaTrigger } from "@/components/ui/media-viewer";
import { Textarea } from "@/components/ui/input";
import { InterestPicker } from "./interest-picker";
import {
  ApiError,
  updateProfile,
  uploadFile,
  type ProfileDetailsInput,
} from "@/lib/mutations";
import { queryKeys } from "@/lib/keys";
import { useMe, useProfile } from "@/lib/queries";
import {
  closeEditProfile,
  isEditProfileOpen,
  subscribeEditProfile,
} from "@/lib/edit-profile";

/** Small caps heading that groups related fields inside a section. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
      {children}
    </span>
  );
}

const EMPTY: ProfileDetailsInput = {
  bio: "",
  github: "",
  linkedin: "",
  website: "",
  cvUrl: "",
  avatar: "",
  interests: [],
  emailNotifications: true,
};

/*
 * Profile editor — mounted ONCE in the Shell, opened from anywhere via
 * lib/edit-profile.ts. It used to live on the profile page behind `?edit=1`,
 * which meant editing a bio cost you your place in the feed.
 *
 * Because it can open on any route, it fetches its own data (useProfile)
 * rather than taking a server-rendered `initial` prop, and re-seeds the form
 * every time it opens so it never shows stale values.
 *
 * The fields are split across two tabs — Profile (who you are: photo, bio,
 * interests) and Details (links, CV, notifications). One long scroll made the
 * footer feel far from the field being edited.
 */
export function EditProfileDialog() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const open = useSyncExternalStore(
    subscribeEditProfile,
    isEditProfileOpen,
    () => false,
  );

  const { data: me } = useMe();
  const handle = me?.handle;
  const { data: profile } = useProfile(handle);

  const [form, setForm] = useState<ProfileDetailsInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  // Seed the form from the server profile. Keyed on the identity of the data
  // rather than `open` alone, because the modal can be opened before the
  // profile query resolves.
  const seed = profile
    ? {
        bio: profile.bio ?? "",
        github: profile.github ?? "",
        linkedin: profile.linkedin ?? "",
        website: profile.website ?? "",
        cvUrl: profile.cvUrl ?? "",
        avatar: profile.avatar ?? "",
        interests: profile.interests ?? [],
        emailNotifications: profile.emailNotifications ?? true,
      }
    : null;
  const seedKey = seed ? JSON.stringify(seed) : "";
  const seededRef = useRef("");

  useEffect(() => {
    if (!open) {
      seededRef.current = "";
      return;
    }
    // Re-seed once per open, and again if the profile arrives late.
    if (seed && seededRef.current !== seedKey) {
      seededRef.current = seedKey;
      setForm(seed);
      setError("");
    }
    // `seed` is derived from seedKey; comparing the key avoids a new-object loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedKey]);

  const dirty = seed ? JSON.stringify(form) !== seedKey : false;

  const set = (key: TextKey) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  function close() {
    closeEditProfile();
    setTab(0);
  }

  /** 401 on any write means the session died mid-edit. */
  function bounceToLogin() {
    close();
    router.push("/login");
  }

  async function pickCv(file: File | undefined) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      set("cvUrl")(await uploadFile(file));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return bounceToLogin();
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
      if (e instanceof ApiError && e.status === 401) return bounceToLogin();
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
      // The editor opens over any route, so refresh every view the profile
      // feeds — the header chip, the suggestions strip, the profile page.
      if (handle) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(handle) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.forYou });
      close();
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return bounceToLogin();
      setError(e instanceof ApiError ? e.message : "Save failed — try again.");
    } finally {
      setSaving(false);
    }
  }

  // Text fields only — interests and emailNotifications have their own controls.
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

  // Nothing to edit until we know who the user is.
  if (!handle) return null;

  return (
    <Dialog
      open={open}
      onClose={close}
      className="bg-muted/70 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-0 rounded-2xl p-1.5 shadow-xl shadow-black/10"
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
          onClick={close}
          className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 -mt-0.5 grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors"
        >
          <CloseCircleIcon size={17} />
        </button>
      </header>

      <TabGroup selectedIndex={tab} onChange={setTab}>
        {/* The switcher sits on the tint, above the inset — so it stays put
            while the fields scroll under it. */}
        <div className="px-2.5 pb-2">
          <Tabs className="w-full">
            <TabItem className="flex-1 justify-center">Profile</TabItem>
            <TabItem className="flex-1 justify-center">Details</TabItem>
          </Tabs>
        </div>

        {/* Inset panel — fields scroll inside it, header/footer never move. */}
        <div className="bg-popover ring-border-surface-strong scroll-slim min-h-0 flex-1 overflow-y-auto rounded-xl p-5 shadow-sm shadow-black/5 ring-[0.5px]">
          <TabPanels>
            {/* ── Who you are ─────────────────────────────────────────── */}
            <TabPanel className="flex flex-col gap-6 outline-none">
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

              {/* Interests — what "For you" matches suggestions against. */}
              <section className="flex flex-col gap-3">
                <SectionLabel>Interests</SectionLabel>
                <p className="text-muted-foreground -mt-1 text-[11px]">
                  Topics you want to see. These drive the “For you” suggestions
                  on your feed.
                </p>
                <InterestPicker
                  value={form.interests}
                  onChange={(interests) =>
                    setForm((f) => ({ ...f, interests }))
                  }
                />
              </section>
            </TabPanel>

            {/* ── Links, CV and preferences ───────────────────────────── */}
            <TabPanel className="flex flex-col gap-6 outline-none">
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
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      <CloudUploadIcon size={15} />
                      {uploading ? "Uploading…" : "Upload CV"}
                    </Button>
                  )}
                  {!form.cvUrl ? (
                    <p className="text-muted-foreground mt-1.5 text-[11px]">
                      PDF, up to 5 MB.
                    </p>
                  ) : null}
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
              <section className="flex flex-col gap-3">
                <SectionLabel>Notifications</SectionLabel>
                <div className="bg-muted/50 ring-border-surface flex items-center gap-3 rounded-xl px-3 py-2.5 ring-[0.5px]">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">
                      Email me about activity
                    </span>
                    <span className="text-muted-foreground block text-[11px]">
                      Replies, upvotes and accepted answers.
                    </span>
                  </span>
                  <Switch
                    aria-label="Email me about activity"
                    checked={form.emailNotifications !== false}
                    onChange={(checked) =>
                      setForm((f) => ({ ...f, emailNotifications: checked }))
                    }
                  />
                </div>
              </section>
            </TabPanel>
          </TabPanels>
        </div>
      </TabGroup>

      {/* Footer sits on the tint, outside the inset — so it never scrolls
          away from the fields being edited. */}
      <footer className="flex shrink-0 items-center gap-3 px-2.5 pt-2.5 pb-1">
        <span className="text-destructive min-w-0 flex-1 truncate text-xs">
          {error}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={close}>
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
  );
}
