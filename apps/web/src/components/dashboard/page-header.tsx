import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { HistoryNav } from "./history-nav";
import { Notifications } from "./notifications";
import { UserMenu } from "./user-menu";
import { XpChip } from "./xp-chip";

/** Top bar shared by every dashboard page: title left, controls right. */
export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 px-5">
      <HistoryNav />
      <h1 className="text-sm font-medium">{title}</h1>
      {children}
      <div className="ml-auto flex items-center gap-2">
        <XpChip />
        <ThemeToggle />
        <Notifications />
        <UserMenu />
      </div>
    </header>
  );
}
