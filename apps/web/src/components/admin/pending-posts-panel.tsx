"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircleIcon, CloseCircleIcon } from "@solar-icons/react/bold-duotone";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { queryKeys } from "@/lib/keys";
import { reviewPost } from "@/lib/mutations";
import { useMe, usePendingPosts } from "@/lib/queries";

export function PendingPostsPanel() {
  const { data: me } = useMe();
  const { data: posts = [], isLoading } = usePendingPosts(!!me?.isAdmin);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  async function review(id: string, action: "approve" | "reject") {
    setBusy(id);
    setNotice("");
    try {
      await reviewPost(id, action);
      await queryClient.invalidateQueries({ queryKey: queryKeys.pendingPosts });
      if (action === "approve") await queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    } catch {
      setNotice("The post could not be updated. Please try again.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Post review</h2>
            <p className="text-muted-foreground mt-1 text-sm">Review community posts before they go live.</p>
          </div>
          <span className="bg-muted rounded-full px-3 py-1 text-sm tabular-nums">{posts.length} waiting</span>
        </div>
        {notice ? <p className="text-destructive mb-3 text-sm">{notice}</p> : null}
        {isLoading ? (
          <Card><CardBody className="text-muted-foreground text-sm">Loading posts…</CardBody></Card>
        ) : posts.length === 0 ? (
          <Card>
            <CardBody className="flex min-h-64 flex-col items-center justify-center text-center">
              <span className="bg-brand/10 text-brand flex size-12 items-center justify-center rounded-xl">
                <CheckCircleIcon size={24} />
              </span>
              <h3 className="mt-4 font-semibold">Review queue is clear</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">New posts that need a decision will appear here.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-muted rounded-md px-2 py-0.5 text-xs capitalize">{post.kind}</span>
                      <span className="text-muted-foreground text-xs">@{post.author} · {post.time}</span>
                    </div>
                    <h3 className="mt-3 font-semibold tracking-tight">{post.title}</h3>
                    <p className="text-muted-foreground mt-1 line-clamp-3 text-sm leading-relaxed">{post.excerpt}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="brand" disabled={busy === post.id} onClick={() => review(post.id, "approve")}>
                      <CheckCircleIcon size={16} /> Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === post.id} onClick={() => review(post.id, "reject")}>
                      <CloseCircleIcon size={16} /> Reject
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
