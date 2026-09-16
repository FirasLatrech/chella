import { redirect } from "next/navigation";
import { PendingPostsPanel } from "@/components/admin/pending-posts-panel";
import { PageHeader } from "@/components/dashboard/page-header";
import { Shell } from "@/components/dashboard/shell";
import { requireAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ReviewPostsPage() {
  const me = await requireAuth("/admin/review");
  if (!me.isAdmin) redirect("/");
  return <Shell><PageHeader title="Review posts" /><PendingPostsPanel /></Shell>;
}
