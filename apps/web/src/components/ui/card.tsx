import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/*
 * Framed card.
 *
 * The card itself is a tinted shell. Header and footer sit directly on that
 * tint, while the main body is an inset white panel rounded on all four
 * corners — so the shell reads as a frame around the content rather than a
 * box with dividing lines.
 *
 *   ╭─────────────────╮  ← shell (tinted)
 *   │  Title / desc   │
 *   │ ╭─────────────╮ │  ← body (inset, white, all corners)
 *   │ │   content   │ │
 *   │ ╰─────────────╯ │
 *   │  footer note    │
 *   ╰─────────────────╯
 */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-muted/60 text-card-foreground flex flex-col rounded-2xl p-1.5",
        "ring-[0.5px] ring-border-surface-strong",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-0.5 px-3.5 pt-3 pb-3.5", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "text-base leading-none font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/** The inset white panel. Rounded on all sides, sitting inside the shell. */
export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-body"
      className={cn(
        "bg-surface-primary rounded-xl p-4",
        "ring-[0.5px] ring-border-surface-strong shadow-sm shadow-black/5",
        className,
      )}
      {...props}
    />
  );
}

/** Kept as an alias so existing usage of CardContent keeps working. */
export const CardContent = CardBody;

/** Sits on the shell tint, below the inset body. */
export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "text-muted-foreground flex items-center gap-1.5 px-3.5 pt-3.5 pb-3 text-sm",
        className,
      )}
      {...props}
    />
  );
}
