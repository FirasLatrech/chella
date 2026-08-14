import Link from "next/link";
import {
  ChatRoundDotsIcon,
  EyeIcon,
} from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";
import { Avatar, skyPosition } from "@/components/ui/avatar";
import { VotePill } from "./vote-pill";

export interface ProjectCardModel {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  tags: string[];
  votes: number;
  views: number;
  comments: number;
  myVote: number;
}

/*
 * Compact gallery card in the frame-inside-tint language: tinted shell, the
 * cover as an inset panel with the vote chip floating on it, and a tight
 * one-line footer — small enough for a four-column grid.
 */
export function ProjectCard({ project }: { project: ProjectCardModel }) {
  return (
    <Link
      href={`/post/${project.id}`}
      className={cn(
        "bg-muted/60 ring-border-surface-strong group flex flex-col rounded-2xl p-1.5 ring-[0.5px]",
        // No hover shadow — the cover's slow zoom is the hover feedback.
        "hover:bg-muted transition-colors duration-200",
      )}
    >
      {/* Inset cover */}
      <div className="ring-border-surface-strong relative aspect-[16/8] w-full overflow-hidden rounded-xl shadow-sm shadow-black/5 ring-[0.5px]">
        <div
          style={skyPosition(project.id + project.title)}
          className="absolute inset-0 bg-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute top-1.5 right-1.5">
          <VotePill postId={project.id} votes={project.votes} myVote={project.myVote} />
        </div>
      </div>

      {/* Copy on the tint */}
      <div className="flex flex-1 flex-col px-1.5 pt-2 pb-1">
        <h2 className="line-clamp-1 text-[13px] font-semibold tracking-tight">
          {project.title}
        </h2>
        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px] leading-relaxed">
          {project.excerpt}
        </p>

        <div className="mt-2 flex items-center gap-1.5">
          <Avatar seed={project.author} size="xs" />
          <span className="text-muted-foreground truncate text-[11px]">
            @{project.author}
          </span>
          <span className="text-muted-foreground/60 hidden truncate text-[10px] sm:block">
            {project.tags.slice(0, 2).join(" · ")}
          </span>
          <div className="text-muted-foreground ml-auto flex shrink-0 items-center gap-2 text-[11px]">
            <span className="flex items-center gap-0.5 tabular-nums">
              <ChatRoundDotsIcon size={11} />
              {project.comments}
            </span>
            <span className="flex items-center gap-0.5 tabular-nums">
              <EyeIcon size={11} />
              {project.views >= 1000
                ? `${(project.views / 1000).toFixed(1)}k`
                : project.views}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
