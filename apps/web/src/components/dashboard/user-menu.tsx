"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  MenuSeparator,
} from "@headlessui/react";
import {
  UserCircleIcon,
  RankingIcon,
  Logout2Icon,
  LoginIcon,
} from "@solar-icons/react/bold-duotone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  controlBase,
  controlGaps,
  controlItemBase,
  controlItemSizes,
  controlSizes,
} from "@/components/ui/control";
import { useInteractionSound } from "@/lib/sound";
import { useMe, queryKeys } from "@/lib/queries";
import { logout } from "@/lib/mutations";

export function UserMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sound = useInteractionSound();
  const { data: me, isLoading } = useMe();

  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.me, null);
      queryClient.invalidateQueries();
      router.refresh();
    },
  });

  // While the session resolves, hold the slot's size so the header is stable.
  if (isLoading) {
    return <div className="size-7 shrink-0" aria-hidden="true" />;
  }

  if (!me) {
    return (
      <Link
        href="/login"
        {...sound}
        className={cn(
          controlBase,
          "cursor-pointer justify-center font-[450] select-none",
          "bg-primary text-primary-foreground hover:bg-primary/80",
          "rounded-full transition-all duration-150 active:scale-95",
          controlGaps.sm,
          controlSizes.sm,
        )}
      >
        <LoginIcon size={15} />
        Sign in
      </Link>
    );
  }

  // Same label + icon as the sidebar's entry, so the two never disagree.
  const items = [
    { href: `/people/${me.handle}`, label: "Profile", icon: UserCircleIcon },
    { href: "/leaderboard", label: "Leaderboard", icon: RankingIcon },
  ];

  return (
    <Menu>
      <div className="relative">
        <MenuButton
          {...sound}
          aria-label="Account menu"
          className={cn(
            "block cursor-pointer rounded-lg outline-none transition-all duration-150",
            "hover:ring-ring/30 hover:ring-2",
            "data-focus:ring-ring/50 data-focus:ring-2",
            "data-open:ring-ring/50 data-open:ring-2",
            "active:scale-95",
          )}
        >
          <Avatar seed={me.handle} size="sm" />
        </MenuButton>

        <MenuItems
          transition
          portal={false}
          modal={false}
          anchor={false}
          className={cn(
            "bg-popover text-popover-foreground absolute right-0 z-50 mt-2 w-56 rounded-xl p-1",
            "ring-border-surface-strong shadow-lg shadow-black/5 ring-[0.5px]",
            "flex flex-col gap-0.5 focus:outline-none",
            "origin-top-right duration-150 ease-out data-closed:scale-95 data-closed:opacity-0",
          )}
        >
          {/* Identity header */}
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar seed={me.handle} size="md" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{me.name}</div>
              <div className="text-muted-foreground truncate text-xs">
                @{me.handle}
              </div>
            </div>
          </div>

          <MenuSeparator className="bg-border-surface my-1 h-px" />

          {items.map((item) => {
            const Icon = item.icon;
            return (
              <MenuItem key={item.href}>
                <Link
                  href={item.href}
                  className={cn(controlItemBase, controlItemSizes.md, "gap-2.5")}
                >
                  <Icon size={16} className="text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              </MenuItem>
            );
          })}

          <MenuSeparator className="bg-border-surface my-1 h-px" />

          <MenuItem>
            <button
              onClick={() => signOut.mutate()}
              className={cn(
                controlItemBase,
                controlItemSizes.md,
                "text-destructive w-full gap-2.5",
              )}
            >
              <Logout2Icon size={16} className="shrink-0" />
              <span className="flex-1 truncate text-left">Sign out</span>
            </button>
          </MenuItem>
        </MenuItems>
      </div>
    </Menu>
  );
}
