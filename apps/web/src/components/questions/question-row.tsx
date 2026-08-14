import {
  CheckCircleIcon,
  ArrowUpIcon,
  EyeIcon,
} from "@solar-icons/react/bold-duotone";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AuthorLink } from "@/components/dashboard/author-link";

export interface QuestionEntry {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  time: string;
  tags: string[];
  votes: number;
  answers: number;
  views: number;
  solved?: boolean;
}

/*
 * The leading tile encodes answer state at a glance:
 *   solved   → emerald check
 *   answered → brand count
 *   open     → muted zero (the "help wanted" signal)
 */
function AnswerState({ entry }: { entry: QuestionEntry }) {
  if (entry.solved) {
    return (
      <div
        title="Solved"
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-500"
      >
        <CheckCircleIcon size={18} />
      </div>
    );
  }
  const answered = entry.answers > 0;
  return (
    <div
      title={`${entry.answers} answers`}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold tabular-nums",
        answered
          ? "bg-brand/10 text-brand-content"
          : "bg-secondary text-muted-foreground",
      )}
    >
      {entry.answers}
    </div>
  );
}

export function QuestionRow({ entry }: { entry: QuestionEntry }) {
  return (
    <Link
      href={`/post/${entry.id}`}
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-xl px-3 py-3.5",
        "transition-colors duration-150 hover:bg-accent/50",
      )}
    >
      <AnswerState entry={entry} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-sm leading-snug font-medium tracking-tight">
            {entry.title}
          </h3>
          <span className="text-muted-foreground/70 shrink-0 text-[11px] whitespace-nowrap">
            {entry.time}
          </span>
        </div>

        <p className="text-muted-foreground mt-1 line-clamp-1 text-xs leading-relaxed">
          {entry.excerpt}
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          <AuthorLink handle={entry.author} className="flex items-center gap-2">
            <Avatar seed={entry.author} size="xs" />
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

          <div className="text-muted-foreground ml-auto flex shrink-0 items-center gap-3 text-xs">
            <span className="text-foreground flex items-center gap-1 font-medium tabular-nums">
              <ArrowUpIcon size={13} />
              {entry.votes}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <EyeIcon size={13} />
              {entry.views >= 1000
                ? `${(entry.views / 1000).toFixed(1)}k`
                : entry.views}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
