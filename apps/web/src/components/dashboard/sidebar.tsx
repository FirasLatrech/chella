"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  HomeSmileIcon,
  QuestionCircleIcon,
  FolderWithFilesIcon,
  CaseMinimalisticIcon,
  RankingIcon,
  BookmarkIcon,
  SidebarMinimalisticIcon,
} from "@solar-icons/react/bold-duotone";
import { useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useInteractionSound } from "@/lib/sound";
import { AdSlot } from "./ad-slot";
import { useFeed } from "@/lib/queries";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

// Badges are filled in at render from live feed data; Jobs has none until
// real listings exist.
const BROWSE: NavItem[] = [
  { href: "/", label: "Feed", icon: HomeSmileIcon },
  { href: "/questions", label: "Questions", icon: QuestionCircleIcon },
  { href: "/projects", label: "Projects", icon: FolderWithFilesIcon },
  { href: "/jobs", label: "Jobs", icon: CaseMinimalisticIcon },
];

const COMMUNITY: NavItem[] = [
  { href: "/leaderboard", label: "Leaderboard", icon: RankingIcon },
  { href: "/saved", label: "Saved", icon: BookmarkIcon },
];

/*
 * The active pill is a single shared element rather than a style on each link.
 * `layoutId` makes Motion animate it between positions (FLIP), so switching
 * sections slides the indicator instead of snapping it.
 */
function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const sound = useInteractionSound();
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      {...sound}
      className={cn(
        // The transparent border matches the pill's edges exactly — including
        // the heavier bottom — so nothing shifts as you navigate.
        "group relative flex items-center rounded-lg border-[0.5px] border-b-[1.5px] border-transparent py-1.5 text-sm transition-colors duration-200",
        collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
        active
          ? "text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
      )}
    >
      {active ? (
        <motion.span
          layoutId="sidebar-active-pill"
          aria-hidden="true"
          className={cn(
            // z-0 (not -z-10) keeps the pill above the sidebar glass; the
            // link's own content sits above it via relative z-10.
            "absolute inset-0 z-0 rounded-lg",
            "bg-background border-border-surface border-[0.5px]",
            "border-b-[1.5px] border-b-black/12 dark:border-b-white/20",
          )}
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 34,
            mass: 0.7,
          }}
        />
      ) : null}
      <Icon
        size={18}
        className={cn(
          "relative z-10 shrink-0 transition-colors duration-200",
          active ? "text-brand" : "opacity-80",
        )}
      />
      {collapsed ? null : (
        <>
          <span className="relative z-10 min-w-0 flex-1 truncate">
            {item.label}
          </span>
          {item.badge ? (
            <span className="text-muted-foreground relative z-10 text-xs tabular-nums">
              {item.badge}
            </span>
          ) : null}
        </>
      )}
    </Link>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  collapsed,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {collapsed ? (
        <div className="bg-border-surface mx-auto my-2 h-px w-6" />
      ) : (
        <div className="text-muted-foreground px-2.5 pt-4 pb-1.5 text-xs font-medium">
          {label}
        </div>
      )}
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={pathname === item.href}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}

export function Sidebar({
  variant = "fixed",
}: {
  /** "drawer" renders inside the mobile off-canvas panel: always expanded,
   *  no collapse toggle (the drawer itself is the dismissal). */
  variant?: "fixed" | "drawer";
} = {}) {
  const pathname = usePathname();
  const [collapsedState, setCollapsed] = useState(false);
  const isDrawer = variant === "drawer";
  const collapsed = isDrawer ? false : collapsedState;

  // Live counts from the feed cache (hydrated on the feed page, fetched once
  // elsewhere and shared for a minute).
  const { data: feed } = useFeed();
  const browse = BROWSE.map((item) =>
    item.href === "/questions" && feed
      ? { ...item, badge: String(feed.filter((e) => e.kind === "question").length) }
      : item,
  );

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "relative flex shrink-0 flex-col gap-1 px-3 py-3",
        "transition-[width] duration-200 ease-out",
        isDrawer
          ? "h-full w-full overflow-y-auto"
          : collapsed
            ? "w-[68px]"
            : "w-60",
      )}
    >
      {/* Brand + collapse toggle */}
      <div className="flex items-center gap-2 pb-1">
        <Link
          href="/"
          data-logo-hover
          className={cn(
            "group/logo hover:bg-foreground/5 flex min-w-0 flex-1 items-center rounded-lg py-1.5 transition-colors",
            collapsed ? "justify-center px-0" : "gap-2 px-1.5",
          )}
        >
          <span className="relative shrink-0">
            {/* Soft brand bloom behind the mark, revealed on hover. */}
            <span
              aria-hidden="true"
              className="bg-brand/40 pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full opacity-0 blur-lg transition-opacity duration-300 group-hover/logo:opacity-100"
            />
            <Logo className="logo-mark text-foreground h-6 w-auto" />
          </span>
          {collapsed ? null : (
            <span className="min-w-0 flex-1 truncate text-lg leading-none font-semibold tracking-[-0.02em]">
              Chelaa
            </span>
          )}
        </Link>
        {collapsed || isDrawer ? null : (
          <Button
            iconOnly
            size="sm"
            variant="ghost"
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(true)}
            className="text-muted-foreground"
          >
            <SidebarMinimalisticIcon size={18} />
          </Button>
        )}
      </div>

      {collapsed ? (
        <Button
          iconOnly
          size="sm"
          variant="ghost"
          aria-label="Expand sidebar"
          onClick={() => setCollapsed(false)}
          className="text-muted-foreground mx-auto"
        >
          <SidebarMinimalisticIcon size={18} />
        </Button>
      ) : null}

      <NavGroup
        label="Browse"
        items={browse}
        pathname={pathname}
        collapsed={collapsed}
      />
      <NavGroup
        label="Community"
        items={COMMUNITY}
        pathname={pathname}
        collapsed={collapsed}
      />

      {/* Sponsored slot pinned to the bottom */}
      <div className="mt-auto pt-3">
        <AdSlot collapsed={collapsed} />
      </div>
    </aside>
  );
}
