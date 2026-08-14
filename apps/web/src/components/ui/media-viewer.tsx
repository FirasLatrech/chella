"use client";

import { Dialog, DialogPanel } from "@headlessui/react";
import { useState, type ReactNode } from "react";
import { CloseCircleIcon } from "@solar-icons/react/bold-duotone";
import { cn } from "@/lib/utils";

/*
 * Full-screen media lightbox. One component for everything attachable —
 * images, PDFs (CVs) and video — picked by file extension. Esc / backdrop
 * click closes; the page never navigates away.
 */

export type MediaKind = "image" | "pdf" | "video";

export function mediaKind(url: string): MediaKind {
  const clean = url.split(/[?#]/)[0].toLowerCase();
  if (clean.endsWith(".pdf")) return "pdf";
  if (/\.(mp4|webm|mov|m4v|ogg)$/.test(clean)) return "video";
  return "image";
}

export function MediaViewer({
  src,
  kind,
  open,
  onClose,
}: {
  src: string;
  kind?: MediaKind;
  open: boolean;
  onClose: () => void;
}) {
  const resolved = kind ?? mediaKind(src);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div aria-hidden="true" className="fixed inset-0 bg-black/75" />
      <div className="fixed inset-0 grid place-items-center p-4 sm:p-10">
        <DialogPanel
          className={cn(
            "relative max-h-full",
            resolved === "pdf" ? "h-full w-full max-w-4xl" : "max-w-5xl",
          )}
        >
          {resolved === "image" ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={src}
              alt=""
              className="mx-auto max-h-[88dvh] max-w-full rounded-2xl object-contain"
            />
          ) : null}
          {resolved === "pdf" ? (
            <iframe
              src={src}
              title="Document"
              className="h-full max-h-[88dvh] w-full rounded-2xl bg-white"
            />
          ) : null}
          {resolved === "video" ? (
            <video
              src={src}
              controls
              autoPlay
              className="mx-auto max-h-[88dvh] max-w-full rounded-2xl"
            />
          ) : null}

          <button
            type="button"
            aria-label="Close viewer"
            onClick={onClose}
            className="absolute -top-2 -right-2 grid size-8 cursor-pointer place-items-center rounded-full bg-black/60 text-white/90 transition-colors hover:bg-black/80 hover:text-white"
          >
            <CloseCircleIcon size={18} />
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

/** Wraps its children in a button that opens the viewer for `src`. */
export function MediaTrigger({
  src,
  kind,
  className,
  label = "View media",
  children,
}: {
  src: string;
  kind?: MediaKind;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        className={cn("cursor-zoom-in", className)}
        onClick={(event) => {
          // Feed rows are <Link>s — never let the tap fall through into
          // navigation.
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </button>
      <MediaViewer src={src} kind={kind} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
