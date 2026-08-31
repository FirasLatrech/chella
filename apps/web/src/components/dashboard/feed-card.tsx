import {
  QuestionCircleIcon,
  FolderWithFilesIcon,
  DocumentTextIcon,
  ChatRoundDotsIcon,
  EyeIcon,
  CheckCircleIcon,
} from "@solar-icons/react/bold-duotone";
import Link from "next/link";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AuthorLink } from "@/components/dashboard/author-link";
import { SaveButton } from "@/components/post/save-button";
import { CopyLinkButton } from "@/components/post/copy-link-button";
import { MediaTrigger } from "@/components/ui/media-viewer";
import { CardImage } from "@/components/ui/card-image";
import { UpvoteButton } from "./upvote-button";
import type { FeedEntry, FeedKind } from "./feed-item";

const KIND: Record<
  FeedKind,
  { icon: ComponentType<{ size?: number; className?: string }>; tint: string }
> = {
  question: { icon: QuestionCircleIcon, tint: "bg-brand/10 text-brand-content" },
  project: {
    icon: FolderWithFilesIcon,
    tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
  },
  post: {
    icon: DocumentTextIcon,
    tint: "bg-amber-500/10 text-amber-700 dark:text-amber-500",
  },
};

function Stat({
  icon: Icon,
  value,
  accent,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  value: number;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs tabular-nums",
        accent ? "text-foreground font-medium" : "text-muted-foreground",
      )}
    >
      <Icon size={13} />
      {formatPoints(value)}
    </span>
  );
}

/*
 * Grid feed card — a self-contained tile rather than a row, for the masonry
 * card layout on the main feed.
 *
 * Fixed-height regions (title clamp, thumbnail aspect ratio) keep every card
 * in a row close enough in height that row-chunked virtualization measures
 * cleanly; the tallest card in a row still wins via measureElement.
 */
export function FeedCard({ entry }: { entry: FeedEntry }) {
  const kind = KIND[entry.kind];
  const KindIcon = kind.icon;

  return (
    <Link
      href={`/post/${entry.id}`}
      className={cn(
        // FIXED height, not h-full: cards in DIFFERENT grid rows must match
        // too, and `h-full` only equalises cards within one row. A card with
        // a thumbnail and one without now come out identical everywhere.
        "group bg-card ring-border-surface-strong relative flex h-[26rem] flex-col rounded-2xl p-4",
        "ring-[0.5px] shadow-sm shadow-black/[0.03] transition-shadow duration-150",
        "hover:shadow-md hover:shadow-black/[0.06]",
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-lg",
            kind.tint,
          )}
        >
          <KindIcon size={15} />
        </div>
        <AuthorLink
          handle={entry.author}
          className="flex min-w-0 items-center gap-1.5"
        >
          <Avatar seed={entry.author} src={entry.avatar} size="xs" />
          <span className="text-muted-foreground truncate text-xs">
            @{entry.author}
          </span>
        </AuthorLink>
      </div>

      {/* FIXED two lines, not a min-height: the grid chunks cards into rows
          and every row takes its tallest card's height, so a title that runs
          to three lines while its neighbours use one leaves a visible gap
          beside them. Two lines at `leading-snug` (1.375) is exactly
          2.75em — anything less clips the second line mid-glyph. */}
      <h3 className="mt-3 line-clamp-2 h-[2.75em] text-[15px] leading-snug font-semibold tracking-tight">
        {entry.title}
        {entry.solved ? (
          <CheckCircleIcon
            size={14}
            aria-label="Solved"
            className="ml-1.5 inline-block align-[-2px] text-emerald-600 dark:text-emerald-500"
          />
        ) : null}
      </h3>

      {/* Tags sit on one clipped line and the row is always present, so a
          card with no tags doesn't pull the media slot up past its
          neighbours'. */}
      <div className="mt-2.5 flex h-[1.375rem] items-center gap-1.5 overflow-hidden">
        {entry.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px]">
            {tag}
          </Badge>
        ))}
        {entry.tags.length > 3 ? (
          <Badge variant="outline" className="text-[10px]">
            +{entry.tags.length - 3}
          </Badge>
        ) : null}
      </div>

      <span className="text-muted-foreground/70 mt-2 text-[11px] whitespace-nowrap">
        {entry.time}
      </span>

      {/*
       * Only a REAL upload gets a thumbnail — no placeholder or generated
       * cover on a post that never had an image.
       *
       * Cards are a fixed height either way, so whichever element can absorb
       * the slack takes `flex-1`: the thumbnail when there is one, the
       * excerpt when there isn't. That keeps the stat bar pinned to the
       * bottom edge of every card.
       */}
      {entry.image ? (
        <div className="ring-border-surface-strong relative mt-3 min-h-0 w-full flex-1 overflow-hidden rounded-xl ring-[0.5px]">
          <MediaTrigger
            src={entry.image}
            label="View image"
            className="absolute inset-0"
          >
            {/* Hover zoom lives on the wrapper so it composes with the
                image's own load-in transition instead of overwriting it. */}
            <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-[1.04]">
              <CardImage src={entry.image} sizes="(min-width: 1500px) 22vw, (min-width: 1024px) 30vw, (min-width: 620px) 45vw, 90vw" />
            </div>
          </MediaTrigger>
        </div>
      ) : null}

      {/* Two lines at `leading-relaxed` (1.625) is exactly 3.25em — a tighter
          box clips the second line through its middle. Next to a thumbnail
          it stays two lines; without one it runs long and takes the space the
          thumbnail would have used. */}
      <p
        className={cn(
          "text-muted-foreground mt-3 text-xs leading-relaxed",
          entry.image
            ? "line-clamp-2 h-[3.25em] shrink-0"
            : "line-clamp-[14] flex-1",
        )}
      >
        {entry.excerpt}
      </p>

      <div className="border-border/70 mt-3.5 flex items-center gap-3 border-t pt-3">
        <UpvoteButton
          postId={entry.id}
          votes={entry.votes}
          myVote={entry.myVote ?? 0}
        />
        <Stat icon={ChatRoundDotsIcon} value={entry.replies} />
        <Stat icon={EyeIcon} value={entry.views} />
        <div className="ml-auto flex items-center gap-1">
          <SaveButton
            id={entry.id}
            saved={entry.saved ?? false}
            size={16}
            className={cn(
              !entry.saved && "text-muted-foreground hover:text-foreground",
            )}
          />
          <CopyLinkButton id={entry.id} />
        </div>
      </div>
    </Link>
  );
}
