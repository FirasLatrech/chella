import { redirect } from "next/navigation";
import { Shell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireAuth } from "@/lib/api";
import { AdminOverview } from "@/components/admin/admin-overview";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireAuth("/admin");
  if (!me.isAdmin) redirect("/");
  return <Shell><PageHeader title="Admin" /><AdminOverview /></Shell>;
}
