import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { HistoryNav } from "./history-nav";
import { MobileNav } from "./mobile-nav";
import { Notifications } from "./notifications";
import { UserMenu } from "./user-menu";
import { XpChip } from "./xp-chip";

/*
 * Top bar shared by every dashboard page: title left, controls right.
 *
 * On phones the menu button replaces the back/forward pair (the browser and
 * OS already provide history there), and the theme toggle drops out — the
 * remaining controls are the ones that carry state a user needs to see.
 */
export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 px-4 pt-[env(safe-area-inset-top)] md:px-5">
      <MobileNav />
      <div className="hidden md:block">
        <HistoryNav />
      </div>
      <h1 className="truncate text-sm font-medium">{title}</h1>
      {children}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <XpChip />
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        <Notifications />
        <UserMenu />
      </div>
    </header>
  );
}
