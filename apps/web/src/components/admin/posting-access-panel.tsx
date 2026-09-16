"use client";

import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheckIcon, UsersGroupRoundedIcon } from "@solar-icons/react/bold-duotone";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/keys";
import { setPriorityPosting } from "@/lib/mutations";
import { useMe, usePriorityPosters } from "@/lib/queries";

export function PostingAccessPanel() {
  const { data: me } = useMe();
  const { data: posters = [], isLoading } = usePriorityPosters(!!me?.isAdmin);
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  async function update(userHandle: string, enabled: boolean) {
    const cleanHandle = userHandle.trim().replace(/^@/, "");
    if (!cleanHandle) return;
    setBusy(cleanHandle);
    setNotice("");
    try {
      await setPriorityPosting(cleanHandle, enabled);
      await queryClient.invalidateQueries({ queryKey: queryKeys.priorityPosters });
      setHandle("");
      setNotice(enabled ? `@${cleanHandle} can now publish directly.` : `Direct posting removed from @${cleanHandle}.`);
    } catch {
      setNotice("User not found or the change failed.");
    } finally {
      setBusy("");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void update(handle, true);
  }

  return (
    <main className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight">Posting access</h2>
          <p className="text-muted-foreground mt-1 text-sm">People here can publish without waiting for review.</p>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><ShieldCheckIcon size={19} className="text-brand" /><CardTitle>Add a person</CardTitle></div>
            <CardDescription>Enter an existing Chelaa username.</CardDescription>
          </CardHeader>
          <CardBody>
            <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
              <Input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="Username, e.g. firas" aria-label="Username" />
              <Button variant="brand" disabled={!handle.trim() || !!busy} className="shrink-0">Allow direct posts</Button>
            </form>
            {notice ? <p className="text-muted-foreground mt-3 text-sm">{notice}</p> : null}
          </CardBody>
        </Card>

        <div className="mt-5 flex items-center justify-between">
          <h3 className="font-semibold tracking-tight">People with access</h3>
          <span className="text-muted-foreground text-sm">{posters.length} total</span>
        </div>
        <Card className="mt-3">
          <CardBody className="p-2">
            {isLoading ? <p className="text-muted-foreground p-3 text-sm">Loading people…</p> : posters.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center text-center">
                <UsersGroupRoundedIcon size={24} className="text-muted-foreground" />
                <p className="mt-3 font-medium">No direct posting access</p>
              </div>
            ) : posters.map((poster) => (
              <div key={poster.handle} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/60">
                <Avatar seed={poster.handle} src={poster.avatar} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{poster.name}</p>
                    {poster.isAdmin ? <span className="bg-brand/10 text-brand rounded-md px-1.5 py-0.5 text-[10px] font-medium">Admin</span> : null}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">@{poster.handle}</p>
                </div>
                <Button size="sm" variant="ghost" disabled={busy === poster.handle} onClick={() => update(poster.handle, false)}>Remove</Button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
