import { redirect } from "next/navigation";
import { BotPanel } from "@/components/admin/bot-panel";
import { PageHeader } from "@/components/dashboard/page-header";
import { Shell } from "@/components/dashboard/shell";
import { requireAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function BotPostsPage() {
  const me = await requireAuth("/admin/bot");
  if (!me.isAdmin) redirect("/");
  return <Shell><PageHeader title="Bot posts" /><BotPanel /></Shell>;
}
