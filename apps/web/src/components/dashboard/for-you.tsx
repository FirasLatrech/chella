"use client";

import { MagicWandIcon, SettingsIcon } from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useForYou, useMe } from "@/lib/queries";
import { openEditProfile } from "@/lib/edit-profile";

/*
 * The one-line explanation above the feed.
 *
 * There is no separate "For you" section: the feed itself is ranked, with
 * interest-matched posts first and everything else newest-first behind them
 * (see `sort=foryou` in apps/api/api.go). A personalized order with nothing
 * saying WHY reads as a bug, so this states the reason — and gives the user
 * the control to change it, opened in place.
 *
 * With no interests set it becomes an invitation to pick some; the feed is
 * plain chronological until then.
 */
export function ForYouNote() {
  const { data: me } = useMe();
  // Reuses the suggestions query purely for the interest list — it is the
  // one read that already knows the reader's effective interests (declared,
  // or derived from what they post).
  const { data } = useForYou();

  if (!data || !me?.handle) return null;

  const { interests } = data;

  // No interests yet — invite, don't explain an ordering that isn't happening.
  if (interests.length === 0) {
    return (
      <Row>
        <MagicWandIcon size={15} className="text-brand shrink-0" />
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
          Pick a few topics and your feed leads with them.
        </span>
        <Button variant="brand" size="sm" onClick={openEditProfile}>
          <MagicWandIcon size={14} />
          Choose interests
        </Button>
      </Row>
    );
  }

  return (
    <Row>
      <MagicWandIcon size={15} className="text-brand shrink-0" />
      <span className="shrink-0 text-xs font-medium">Sorted for you</span>
      <span className="text-muted-foreground hidden min-w-0 flex-1 items-center gap-1 overflow-hidden text-xs sm:flex">
        {interests.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="secondary" className="shrink-0">
            {tag}
          </Badge>
        ))}
        {interests.length > 3 ? (
          <span className="shrink-0">+{interests.length - 3}</span>
        ) : null}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={openEditProfile}
        className="text-muted-foreground hover:text-foreground ml-auto shrink-0"
      >
        <SettingsIcon size={14} />
        Edit
      </Button>
    </Row>
  );
}

/** Shared frame: a quiet line, not a card competing with the feed. */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("mb-3 flex items-center gap-2 px-0.5")}>{children}</div>
  );
}
