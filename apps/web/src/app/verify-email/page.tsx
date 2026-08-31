import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage() {
  const me = await requireAuth(undefined, true);
  if (me.emailVerified) redirect("/");

  return <VerifyEmailForm />;
}
