import type { ReactNode } from "react";
import { requireAuth } from "@/lib/api";

// The showcase page is a client component, so the session check lives in
// this server layout — the proxy alone only checks cookie presence.
export default async function UiLayout({ children }: { children: ReactNode }) {
  await requireAuth("/ui");
  return children;
}
