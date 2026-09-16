import { redirect } from "next/navigation";
import { SponsorPanel } from "@/components/admin/sponsor-panel";
import { PageHeader } from "@/components/dashboard/page-header";
import { Shell } from "@/components/dashboard/shell";
import { requireAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  const me = await requireAuth("/admin/sponsors");
  if (!me.isAdmin) redirect("/");
  return <Shell><PageHeader title="Sponsors" /><SponsorPanel /></Shell>;
}
