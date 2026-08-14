"use client";

import { useRouter } from "next/navigation";
import { RoundArrowLeftIcon, RoundArrowRightIcon } from "@solar-icons/react/bold-duotone";
import { Button } from "@/components/ui/button";
import { useInteractionSound } from "@/lib/sound";

/** Browser-style back/forward, sitting right before the page title. */
export function HistoryNav() {
  const router = useRouter();
  const sound = useInteractionSound();

  return (
    <div className="flex items-center">
      <Button
        iconOnly
        size="sm"
        variant="ghost"
        onClick={() => router.back()}
        {...sound}
        aria-label="Go back"
        className="text-muted-foreground hover:text-foreground size-7"
      >
        <RoundArrowLeftIcon size={17} />
      </Button>
      <Button
        iconOnly
        size="sm"
        variant="ghost"
        onClick={() => router.forward()}
        {...sound}
        aria-label="Go forward"
        className="text-muted-foreground hover:text-foreground size-7"
      >
        <RoundArrowRightIcon size={17} />
      </Button>
    </div>
  );
}
