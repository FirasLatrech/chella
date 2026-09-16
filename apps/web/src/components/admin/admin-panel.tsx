"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircleIcon, CloseCircleIcon, ShieldCheckIcon } from "@solar-icons/react/bold-duotone";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { queryKeys, type Sponsor, useMe, usePendingPosts, useSponsor } from "@/lib/queries";
import { reviewPost, setPriorityPosting, updateSponsor, uploadImage } from "@/lib/mutations";

export function AdminPanel() {
  const { data: me } = useMe();
  const { data: posts = [], isLoading } = usePendingPosts(!!me?.isAdmin);
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState("");
  const [notice, setNotice] = useState("");
  const { data: savedSponsor } = useSponsor();

  async function review(id: string, action: "approve" | "reject") {
    await reviewPost(id, action);
    await queryClient.invalidateQueries({ queryKey: queryKeys.pendingPosts });
    if (action === "approve") await queryClient.invalidateQueries({ queryKey: queryKeys.feed });
  }
  async function grantPriority(enabled: boolean) {
    if (!handle.trim()) return;
    try { await setPriorityPosting(handle.trim(), enabled); setNotice(`${handle.trim()} can ${enabled ? "post directly" : "no longer post directly"}.`); }
    catch { setNotice("User not found or the change failed."); }
  }

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Card><CardHeader><div className="flex items-center gap-2"><ShieldCheckIcon size={20} className="text-brand"/><CardTitle>Posting permissions</CardTitle></div><CardDescription>Priority users publish right away. Everyone else goes to review.</CardDescription></CardHeader><CardBody className="flex flex-col gap-3 sm:flex-row"><Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Username, e.g. firas" aria-label="Username" /><div className="flex gap-2"><Button size="sm" variant="brand" onClick={() => grantPriority(true)}>Allow direct posts</Button><Button size="sm" variant="outline" onClick={() => grantPriority(false)}>Remove</Button></div>{notice ? <p className="text-muted-foreground text-sm sm:self-center">{notice}</p> : null}</CardBody></Card>
        {savedSponsor ? <SponsorCard key={JSON.stringify(savedSponsor)} sponsor={savedSponsor} /> : null}
        <Card><CardHeader><CardTitle>Pending posts</CardTitle><CardDescription>{posts.length} post{posts.length === 1 ? "" : "s"} waiting for a decision.</CardDescription></CardHeader><CardBody className="flex flex-col gap-3">{isLoading ? <p className="text-muted-foreground text-sm">Loading posts…</p> : posts.length === 0 ? <p className="text-muted-foreground text-sm">All clear. No posts need review.</p> : posts.map((post) => <article key={post.id} className="rounded-lg bg-muted/55 p-3 ring-[0.5px] ring-border-surface"><div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><p className="font-medium">{post.title}</p><p className="text-muted-foreground text-xs">@{post.author} · {post.kind} · {post.time}</p><p className="text-muted-foreground mt-2 text-sm">{post.excerpt}</p></div><div className="flex gap-2"><Button size="sm" variant="brand" aria-label={`Approve ${post.title}`} onClick={() => review(post.id, "approve")}><CheckCircleIcon size={16}/>Approve</Button><Button size="sm" variant="destructive" aria-label={`Reject ${post.title}`} onClick={() => review(post.id, "reject")}><CloseCircleIcon size={16}/>Reject</Button></div></div></article>)}</CardBody></Card>
      </div>
    </div>
  );
}

function SponsorCard({ sponsor: initial }: { sponsor: Sponsor }) {
  const [sponsor, setSponsor] = useState(initial);
  const [notice, setNotice] = useState("");
  const queryClient = useQueryClient();
  async function saveSponsor() {
    try { await updateSponsor(sponsor); await queryClient.invalidateQueries({ queryKey: queryKeys.sponsor }); setNotice("Sponsor saved. The sidebar updates for everyone."); }
    catch { setNotice("Could not save the sponsor. Check the link and required fields."); }
  }
  async function addSponsorImage(file?: File) {
    if (!file) return;
    try { const imageUrl = await uploadImage(file); setSponsor((value) => ({ ...value, imageUrl })); setNotice("Image uploaded. Save sponsor to publish it."); }
    catch { setNotice("Image upload failed."); }
  }
  return <Card><CardHeader><CardTitle>Sidebar sponsor</CardTitle><CardDescription>One active sponsor is shown in the sidebar. Turn it off any time.</CardDescription></CardHeader><CardBody className="flex flex-col gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sponsor.active} onChange={(e) => setSponsor((value) => ({ ...value, active: e.target.checked }))} /> Show this sponsor</label><div className="grid gap-3 sm:grid-cols-2"><Input value={sponsor.name} onChange={(e) => setSponsor((value) => ({ ...value, name: e.target.value }))} placeholder="Sponsor name" /><Input value={sponsor.title} onChange={(e) => setSponsor((value) => ({ ...value, title: e.target.value }))} placeholder="Short title" /></div><Input value={sponsor.href} onChange={(e) => setSponsor((value) => ({ ...value, href: e.target.value }))} placeholder="https://sponsor.com" /><div className="flex flex-wrap items-center gap-2"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => addSponsorImage(e.target.files?.[0])} className="text-sm" />{sponsor.imageUrl ? <span className="text-muted-foreground text-xs">Image ready</span> : <span className="text-muted-foreground text-xs">Image is optional</span>}</div><Button size="sm" variant="brand" className="self-start" onClick={saveSponsor}>Save sponsor</Button>{notice ? <p className="text-muted-foreground text-sm">{notice}</p> : null}</CardBody></Card>;
}
