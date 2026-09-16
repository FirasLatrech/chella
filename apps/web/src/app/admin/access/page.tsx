import { redirect } from "next/navigation";
import { PostingAccessPanel } from "@/components/admin/posting-access-panel";
import { PageHeader } from "@/components/dashboard/page-header";
import { Shell } from "@/components/dashboard/shell";
import { requireAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PostingAccessPage() {
  const me = await requireAuth("/admin/access");
  if (!me.isAdmin) redirect("/");
  return <Shell><PageHeader title="Posting access" /><PostingAccessPanel /></Shell>;
}
