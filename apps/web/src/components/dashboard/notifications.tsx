"use client";

import Link from "next/link";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
  BellIcon,
  BellOffIcon,
  AltArrowUpIcon,
  ReplyIcon,
  CheckCircleIcon,
  CheckReadIcon,
  AltArrowRightIcon,
} from "@solar-icons/react/bold-duotone";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInteractionSound } from "@/lib/sound";
import {
  useNotifications,
  queryKeys,
  type NotificationItem,
} from "@/lib/queries";
import { readNotification, readAllNotifications } from "@/lib/mutations";

const KIND: Record<
  NotificationItem["kind"],
  {
    icon: ComponentType<{ size?: number; className?: string }>;
    tint: string;
    text: string;
  }
> = {
  reply: {
    icon: ReplyIcon,
    tint: "text-brand",
    text: "replied to your post",
  },
  thread: {
    icon: ReplyIcon,
    tint: "text-brand",
    text: "replied to your comment",
  },
  vote: {
    icon: AltArrowUpIcon,
    tint: "text-emerald-600 dark:text-emerald-500",
    text: "upvoted your post",
  },
  accept: {
    icon: CheckCircleIcon,
    tint: "text-amber-500",
    text: "accepted your answer",
  },
};

/*
 * Live notifications from real events (replies, upvotes, accepted answers),
 * polled every 30s through the React Query cache.
 */
export function Notifications() {
  const queryClient = useQueryClient();
  const sound = useInteractionSound();
  const { data } = useNotifications();

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications });

  const markAll = useMutation({
    mutationFn: readAllNotifications,
    onSuccess: invalidate,
  });
  const markOne = useMutation({
    mutationFn: readNotification,
    onSuccess: invalidate,
  });

  return (
    <Popover>
      <div className="relative">
        <PopoverButton
          as={Button}
          iconOnly
          size="sm"
          variant="ghost"
          {...sound}
          aria-label={
            unread ? `Notifications, ${unread} unread` : "Notifications"
          }
          className="text-muted-foreground hover:text-foreground relative"
        >
          <BellIcon size={18} />
          <AnimatePresence>
            {unread > 0 ? (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className={cn(
                  "bg-brand text-brand-foreground absolute -top-0.5 -right-0.5",
                  "grid min-w-4 place-items-center rounded-full px-1",
                  "ring-background text-[10px] font-semibold tabular-nums ring-2",
                )}
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </PopoverButton>

        <PopoverPanel
          transition
          portal={false}
          modal={false}
          anchor={false}
          className={cn(
            "bg-muted/70 text-popover-foreground absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl p-1.5",
            "ring-border-surface-strong shadow-xl shadow-black/10 ring-[0.5px]",
            "supports-[backdrop-filter:blur(1px)]:backdrop-blur-md",
            "flex flex-col focus:outline-none",
            "origin-top-right duration-150 ease-out data-closed:scale-95 data-closed:opacity-0",
          )}
        >
          <header className="flex items-center gap-2 px-2 pt-1.5 pb-2.5">
            <h2 className="text-sm font-semibold tracking-tight">
              Notifications
            </h2>
            {unread > 0 ? (
              <span className="bg-brand/10 text-brand-content ring-brand/20 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums ring-[0.5px]">
                {unread} new
              </span>
            ) : null}
            {unread > 0 ? (
              <button
                onClick={() => markAll.mutate()}
                title="Mark all as read"
                className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 ml-auto flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors"
              >
                <CheckReadIcon size={14} />
              </button>
            ) : null}
          </header>

          {/* Inset list panel */}
          <div className="bg-popover ring-border-surface-strong overflow-hidden rounded-xl shadow-sm shadow-black/5 ring-[0.5px]">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <BellOffIcon size={28} className="text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">
                  You&rsquo;re all caught up
                </p>
              </div>
            ) : (
              <ul className="scroll-slim max-h-[300px] overflow-y-auto p-1">
                {items.map((n) => {
                  const kind = KIND[n.kind];
                  const Icon = kind.icon;
                  return (
                    <li key={n.id}>
                      <Link
                        href={`/post/${n.postId}`}
                        onClick={() => {
                          if (!n.read) markOne.mutate(n.id);
                        }}
                        className="hover:bg-accent/70 flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors"
                      >
                        <div className="relative shrink-0">
                          <Avatar seed={n.actor} size="sm" />
                          <span
                            className={cn(
                              "bg-popover ring-border-surface absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full ring-[0.5px]",
                              kind.tint,
                            )}
                          >
                            <Icon size={10} />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug">
                            <span className="font-medium">@{n.actor}</span>{" "}
                            <span className="text-muted-foreground">
                              {kind.text}
                            </span>
                          </p>
                          <p className="text-muted-foreground mt-0.5 truncate text-xs">
                            {n.postTitle}
                          </p>
                          <p className="text-muted-foreground/70 mt-0.5 text-[11px]">
                            {n.time}
                          </p>
                        </div>

                        {!n.read ? (
                          <span className="bg-brand mt-1.5 size-1.5 shrink-0 rounded-full" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <footer className="flex items-center justify-center px-2 pt-2 pb-1">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
              Updates every 30s
              <AltArrowRightIcon size={12} className="opacity-0" />
            </span>
          </footer>
        </PopoverPanel>
      </div>
    </Popover>
  );
}
