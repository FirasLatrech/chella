"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GalleryIcon, SpeakerIcon } from "@solar-icons/react/bold-duotone";
import { BUILT_IN_SPONSORS, type AdSlide } from "@/components/dashboard/ad-slot";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, InputField } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/keys";
import { updateSponsor, uploadImage } from "@/lib/mutations";
import { type Sponsor, useSponsor } from "@/lib/queries";

const EMPTY_SPONSOR: Sponsor = { active: false, name: "", title: "", href: "", imageUrl: "" };

export function SponsorPanel() {
  const { data: savedSponsor, isLoading } = useSponsor();
  const active = savedSponsor?.active ?? false;

  return (
    <main className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight">Sponsors</h2>
          <p className="text-muted-foreground mt-1 text-sm">See the current cards and manage the custom sponsor slot.</p>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold tracking-tight">Existing sponsors</h3>
              <p className="text-muted-foreground text-sm">These two sponsor cards already exist in the sidebar.</p>
            </div>
            <span className="bg-muted rounded-full px-3 py-1 text-sm">{active ? "Hidden by custom sponsor" : "Live"}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {BUILT_IN_SPONSORS.map((item) => <SponsorPreview key={item.id} sponsor={item} />)}
          </div>
        </section>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2"><SpeakerIcon size={19} className="text-brand" /><CardTitle>Custom sponsor</CardTitle></div>
            <CardDescription>When enabled, this card replaces the two existing sponsor cards.</CardDescription>
          </CardHeader>
          <CardBody className="flex flex-col gap-5">
            {isLoading ? <p className="text-muted-foreground text-sm">Loading saved sponsor…</p> : (
              <SponsorEditor key={JSON.stringify(savedSponsor)} initial={savedSponsor ?? EMPTY_SPONSOR} />
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

function SponsorEditor({ initial }: { initial: Sponsor }) {
  const [sponsor, setSponsor] = useState(initial);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const updated = await updateSponsor(sponsor);
      queryClient.setQueryData(queryKeys.sponsor, updated);
      setNotice("Sponsor settings saved. The sidebar is updated.");
    } catch {
      setNotice("Could not save. Check the name, title, and full link.");
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
      setSponsor((current) => ({ ...current, imageUrl }));
      setNotice("Image uploaded. Save changes to publish it.");
    } catch {
      setNotice("Image upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 p-3">
        <div>
          <p className="text-sm font-medium">Show custom sponsor</p>
          <p className="text-muted-foreground text-xs">Turn this off to show CareerPath and hushstat.</p>
        </div>
        <Switch checked={sponsor.active} onChange={(active) => setSponsor((current) => ({ ...current, active }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Sponsor name"><Input value={sponsor.name} onChange={(event) => setSponsor((current) => ({ ...current, name: event.target.value }))} placeholder="Company name" /></InputField>
        <InputField label="Card title"><Input value={sponsor.title} onChange={(event) => setSponsor((current) => ({ ...current, title: event.target.value }))} placeholder="Short sponsor message" /></InputField>
      </div>
      <InputField label="Destination link" description="Use a full link, for example https://example.com.">
        <Input type="url" value={sponsor.href} onChange={(event) => setSponsor((current) => ({ ...current, href: event.target.value }))} placeholder="https://example.com" />
      </InputField>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => upload(event.target.files?.[0])} className="sr-only" />
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <GalleryIcon size={16} /> {uploading ? "Uploading…" : sponsor.imageUrl ? "Change image" : "Upload image"}
        </Button>
        {sponsor.imageUrl ? <Button type="button" size="sm" variant="ghost" onClick={() => setSponsor((current) => ({ ...current, imageUrl: "" }))}>Remove image</Button> : null}
      </div>
      {sponsor.name || sponsor.title || sponsor.imageUrl ? (
        <div className="max-w-sm"><SponsorPreview sponsor={{ id: "custom", sponsor: sponsor.name || "Sponsor", title: sponsor.title || "Sponsor title", href: sponsor.href || "#", image: sponsor.imageUrl || undefined }} /></div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="brand" disabled={saving || uploading} onClick={save}>{saving ? "Saving…" : "Save changes"}</Button>
        {notice ? <p className="text-muted-foreground text-sm">{notice}</p> : null}
      </div>
    </>
  );
}

function SponsorPreview({ sponsor }: { sponsor: AdSlide }) {
  return (
    <Card>
      <CardBody className="p-2">
        <div className="bg-muted relative aspect-[16/7] overflow-hidden rounded-xl">
          {/* Local built-ins and upload URLs are shown as-is in this admin preview. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sponsor.image || "/images/sky-background.webp"} alt="" className="size-full object-cover" />
          <span className="absolute top-2 left-2 rounded-md bg-black/30 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">Ad</span>
        </div>
        <div className="flex items-center justify-between gap-3 px-2 pt-3 pb-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{sponsor.title}</p>
            <p className="text-muted-foreground truncate text-xs">{sponsor.sponsor}</p>
          </div>
          <span className="bg-brand/10 text-brand rounded-md px-2 py-1 text-xs">Ready</span>
        </div>
      </CardBody>
    </Card>
  );
}
