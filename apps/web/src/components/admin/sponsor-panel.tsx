"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AddCircleIcon,
  GalleryIcon,
  PenNewSquareIcon,
  SpeakerIcon,
  TrashBinTrashIcon,
} from "@solar-icons/react/bold-duotone";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, InputField } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/keys";
import {
  createSponsor,
  deleteSponsor,
  type SponsorInput,
  updateSponsor,
  uploadImage,
} from "@/lib/mutations";
import { type Sponsor, useAdminSponsors, useMe } from "@/lib/queries";

const EMPTY_SPONSOR: SponsorInput = {
  active: true,
  name: "",
  title: "",
  href: "",
  imageUrl: "",
};

export function SponsorPanel() {
  const { data: me } = useMe();
  const { data: sponsors = [], isLoading } = useAdminSponsors(!!me?.isAdmin);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Sponsor | "new" | null>(null);
  const [busy, setBusy] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSponsors }),
      queryClient.invalidateQueries({ queryKey: queryKeys.sponsors }),
    ]);
  }

  async function toggle(sponsor: Sponsor) {
    setBusy(sponsor.id);
    setNotice("");
    try {
      await updateSponsor(sponsor.id, { ...sponsor, active: !sponsor.active });
      await refresh();
    } catch {
      setNotice("Could not update this sponsor.");
    } finally {
      setBusy("");
    }
  }

  async function remove(sponsor: Sponsor) {
    if (confirmDelete !== sponsor.id) {
      setConfirmDelete(sponsor.id);
      return;
    }
    setBusy(sponsor.id);
    setNotice("");
    try {
      await deleteSponsor(sponsor.id);
      if (typeof editing !== "string" && editing?.id === sponsor.id) setEditing(null);
      setConfirmDelete("");
      await refresh();
    } catch {
      setNotice("Could not delete this sponsor.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Sponsors</h2>
            <p className="text-muted-foreground mt-1 text-sm">Create, edit, disable, or delete every sidebar sponsor.</p>
          </div>
          <Button variant="brand" onClick={() => { setEditing("new"); setConfirmDelete(""); }}>
            <AddCircleIcon size={17} /> Add sponsor
          </Button>
        </div>

        {editing ? (
          <SponsorEditor
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={async () => { setEditing(null); await refresh(); }}
          />
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold tracking-tight">All sponsors</h3>
            <p className="text-muted-foreground text-sm">Disabled cards stay saved but do not appear in the sidebar.</p>
          </div>
          <span className="bg-muted rounded-full px-3 py-1 text-sm">{sponsors.filter((sponsor) => sponsor.active).length} live</span>
        </div>

        {notice ? <p className="text-destructive mt-3 text-sm">{notice}</p> : null}
        {isLoading ? (
          <Card className="mt-3"><CardBody className="text-muted-foreground text-sm">Loading sponsors…</CardBody></Card>
        ) : sponsors.length === 0 ? (
          <Card className="mt-3">
            <CardBody className="flex min-h-56 flex-col items-center justify-center text-center">
              <SpeakerIcon size={26} className="text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No sponsors yet</h3>
              <p className="text-muted-foreground mt-1 text-sm">Add a sponsor to show it in the sidebar.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {sponsors.map((sponsor) => (
              <SponsorCard
                key={sponsor.id}
                sponsor={sponsor}
                busy={busy === sponsor.id}
                confirmingDelete={confirmDelete === sponsor.id}
                onEdit={() => { setEditing(sponsor); setConfirmDelete(""); }}
                onToggle={() => toggle(sponsor)}
                onDelete={() => remove(sponsor)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function SponsorCard({
  sponsor,
  busy,
  confirmingDelete,
  onEdit,
  onToggle,
  onDelete,
}: {
  sponsor: Sponsor;
  busy: boolean;
  confirmingDelete: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={!sponsor.active ? "opacity-70" : undefined}>
      <CardBody className="p-2">
        <div className="bg-muted relative aspect-[16/7] overflow-hidden rounded-xl">
          {/* Sponsor images can be local built-ins or URLs from our upload service. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sponsor.imageUrl || "/images/sky-background.webp"} alt="" className="size-full object-cover" />
          <span className="absolute top-2 left-2 rounded-md bg-black/30 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">Ad</span>
          <span className="absolute top-2 right-2 rounded-md bg-background/90 px-2 py-1 text-[10px] font-medium backdrop-blur-sm">
            {sponsor.active ? "Live" : "Disabled"}
          </span>
        </div>
        <div className="px-2 pt-3">
          <p className="truncate text-sm font-medium">{sponsor.title}</p>
          <p className="text-muted-foreground truncate text-xs">{sponsor.name}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 px-2 pb-1">
          <Button size="sm" variant="outline" disabled={busy} onClick={onEdit}><PenNewSquareIcon size={15} /> Edit</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onToggle}>{sponsor.active ? "Disable" : "Enable"}</Button>
          <Button size="sm" variant={confirmingDelete ? "destructive" : "ghost"} disabled={busy} onClick={onDelete} className="ml-auto">
            <TrashBinTrashIcon size={15} /> {confirmingDelete ? "Confirm delete" : "Delete"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function SponsorEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Sponsor;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<SponsorInput>(initial ?? EMPTY_SPONSOR);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      if (initial) await updateSponsor(initial.id, form);
      else await createSponsor(form);
      await onSaved();
    } catch {
      setNotice("Could not save. Add a name, title, and full link.");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setNotice("");
    try {
      const imageUrl = await uploadImage(file);
      setForm((current) => ({ ...current, imageUrl }));
    } catch {
      setNotice("Image upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? `Edit ${initial.name}` : "Add sponsor"}</CardTitle>
        <CardDescription>{initial ? "Update this sponsor card." : "Create a new card for the sidebar."}</CardDescription>
      </CardHeader>
      <CardBody className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 p-3">
          <div><p className="text-sm font-medium">Show in sidebar</p><p className="text-muted-foreground text-xs">You can disable it later without deleting it.</p></div>
          <Switch checked={form.active} onChange={(active) => setForm((current) => ({ ...current, active }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Sponsor name"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Company name" /></InputField>
          <InputField label="Card title"><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Short sponsor message" /></InputField>
        </div>
        <InputField label="Destination link" description="Use a full link, for example https://example.com.">
          <Input type="url" value={form.href} onChange={(event) => setForm((current) => ({ ...current, href: event.target.value }))} placeholder="https://example.com" />
        </InputField>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => upload(event.target.files?.[0])} className="sr-only" />
          <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <GalleryIcon size={16} /> {uploading ? "Uploading…" : form.imageUrl ? "Change image" : "Upload image"}
          </Button>
          {form.imageUrl ? <Button type="button" size="sm" variant="ghost" onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}>Remove image</Button> : null}
        </div>
        {notice ? <p className="text-destructive text-sm">{notice}</p> : null}
        <div className="flex gap-2">
          <Button variant="brand" disabled={saving || uploading} onClick={save}>{saving ? "Saving…" : initial ? "Save changes" : "Create sponsor"}</Button>
          <Button variant="outline" disabled={saving || uploading} onClick={onCancel}>Cancel</Button>
        </div>
      </CardBody>
    </Card>
  );
}
