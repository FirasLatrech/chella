import {
  QuestionCircleIcon,
  FolderWithFilesIcon,
  DocumentTextIcon,
  ArrowUpIcon,
  ChatRoundDotsIcon,
  EyeIcon,
  CheckCircleIcon,
} from "@solar-icons/react/bold-duotone";
import Link from "next/link";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { Avatar, skyPosition } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AuthorLink } from "@/components/dashboard/author-link";
import { SaveButton } from "@/components/post/save-button";
import { MediaTrigger } from "@/components/ui/media-viewer";

export type FeedKind = "question" | "project" | "post";

export interface FeedEntry {
  id: string;
  kind: FeedKind;
  title: string;
  excerpt: string;
  author: string;
  time: string;
  tags: string[];
  votes: number;
  replies: number;
  views: number;
  /** Questions only — an answer has been accepted. */
  solved?: boolean;
  /** Mock media — renders as a unique sky crop derived from the entry id,
   *  same trick as avatars. */
  hasImage?: boolean;
  /** Real attached media (e.g. an object URL from the composer). Wins over
   *  the mock crop when both are set. */
  image?: string;
  /** The requesting user's vote on this entry (-1, 0, 1). */
  myVote?: number;
  /** The requesting user bookmarked this entry. */
  saved?: boolean;
  /** Body was changed after posting. */
  edited?: boolean;
  /** The requesting user wrote this. */
  mine?: boolean;
  /** Author's uploaded avatar, when they have one. */
  avatar?: string;
}

const KIND: Record<
  FeedKind,
  {
    icon: ComponentType<{ size?: number; className?: string }>;
    tint: string;
    label: string;
  }
> = {
  question: {
    icon: QuestionCircleIcon,
    tint: "bg-brand/10 text-brand-content",
    label: "Question",
  },
  project: {
    icon: FolderWithFilesIcon,
    tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
    label: "Project",
  },
  post: {
    icon: DocumentTextIcon,
    tint: "bg-amber-500/10 text-amber-700 dark:text-amber-500",
    label: "Post",
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
      {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
    </span>
  );
}

export function FeedItem({ entry }: { entry: FeedEntry }) {
  const kind = KIND[entry.kind];
  const KindIcon = kind.icon;

  return (
    <Link
      href={`/post/${entry.id}`}
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-xl px-3 py-3.5",
        "transition-colors duration-150 hover:bg-accent/50",
      )}
    >
      {/* Kind tile anchors the row and encodes the content type at a glance. */}
      <div
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          kind.tint,
        )}
      >
        <KindIcon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 text-sm leading-snug font-medium tracking-tight">
                {entry.title}
                {entry.solved ? (
                  <CheckCircleIcon
                    size={14}
                    aria-label="Solved"
                    className="ml-1.5 inline-block align-[-2px] text-emerald-600 dark:text-emerald-500"
                  />
                ) : null}
              </h3>
              <span className="text-muted-foreground/70 shrink-0 text-[11px] whitespace-nowrap">
                {entry.time}
              </span>
            </div>

            <p
              className={cn(
                "text-muted-foreground mt-1 text-xs leading-relaxed",
                entry.hasImage || entry.image ? "line-clamp-2" : "line-clamp-1",
              )}
            >
              {entry.excerpt}
            </p>
          </div>

          {entry.image || entry.hasImage ? (
            <div className="ring-border-surface-strong relative hidden h-[68px] w-28 shrink-0 overflow-hidden rounded-lg ring-[0.5px] sm:block">
              {entry.image ? (
                <MediaTrigger
                  src={entry.image}
                  label="View image"
                  className="absolute inset-0"
                >
                  <div
                    style={{ backgroundImage: `url(${entry.image})` }}
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                  />
                </MediaTrigger>
              ) : (
                <div
                  style={skyPosition(entry.id + entry.title)}
                  className="absolute inset-0 bg-cover transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                />
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <AuthorLink handle={entry.author} className="flex items-center gap-2">
            <Avatar seed={entry.author} src={entry.avatar} size="xs" />
            <span className="text-muted-foreground truncate text-xs">
              @{entry.author}
            </span>
          </AuthorLink>
          <span className="hidden gap-1.5 sm:flex">
            {entry.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <Stat icon={ArrowUpIcon} value={entry.votes} accent />
            <Stat icon={ChatRoundDotsIcon} value={entry.replies} />
            <Stat icon={EyeIcon} value={entry.views} />
            {/* Visible on hover, or always once saved. */}
            <SaveButton
              id={entry.id}
              saved={entry.saved ?? false}
              className={cn(
                "-my-1 -mr-1",
                !entry.saved &&
                  "opacity-0 transition-opacity group-hover:opacity-100",
              )}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
