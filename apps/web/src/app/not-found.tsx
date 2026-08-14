import Link from "next/link";
import { CompassIcon, ArrowLeftIcon } from "@solar-icons/react/bold-duotone";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  controlBase,
  controlGaps,
  controlSizes,
} from "@/components/ui/control";

/*
 * 404 sits on the same sky backdrop as the app shell, but full-bleed rather
 * than framed — there is no navigation to anchor, so the page reads as open
 * air with a single card floating in it.
 */
export default function NotFound() {
  return (
    <div className="app-backdrop flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <Link
        href="/"
        data-logo-hover
        className="group/logo absolute top-6 left-6 flex items-center gap-2"
      >
        <span className="relative shrink-0">
          <span
            aria-hidden="true"
            className="bg-brand/40 pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full opacity-0 blur-lg transition-opacity duration-300 group-hover/logo:opacity-100"
          />
          <Logo className="logo-mark text-foreground h-6 w-auto" />
        </span>
        <span className="text-lg leading-none font-semibold tracking-[-0.02em]">
          Chelaa
        </span>
      </Link>

      <div className="bg-background/70 ring-border-surface-strong w-full max-w-md rounded-2xl p-8 text-center ring-[0.5px] supports-[backdrop-filter:blur(1px)]:backdrop-blur-xl">
        <div className="bg-brand/10 text-brand mx-auto grid size-14 place-items-center rounded-2xl">
          <CompassIcon size={28} />
        </div>

        <div className="text-muted-foreground mt-6 font-mono text-sm tracking-widest">
          404
        </div>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          You&rsquo;ve drifted off the map
        </h1>

        <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm">
          This page doesn&rsquo;t exist — it may have been moved, or the link
          might be wrong.
        </p>

        {/* A styled Link rather than <Button as={Link}> — Button is a client
            component, and a function prop can't cross the server boundary. */}
        <div className="mt-7 flex items-center justify-center gap-2">
          <Link
            href="/"
            className={cn(
              controlBase,
              "cursor-pointer justify-center font-[450] select-none",
              "bg-primary text-primary-foreground hover:bg-primary/80",
              "rounded-full transition-all duration-150 active:scale-95",
              controlGaps.md,
              controlSizes.md,
            )}
          >
            <ArrowLeftIcon size={16} />
            Back to feed
          </Link>
        </div>
      </div>

      <p className="text-muted-foreground/70 mt-6 text-xs">
        Error 404 &middot; Chelaa
      </p>
    </div>
  );
}
