"use client";

import {
  Dialog as HeadlessDialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Description,
} from "@headlessui/react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Re-exported so callers that build their own header (e.g. a frame-inside-tint
// panel) keep the accessible title association Headless UI needs.
export { DialogTitle };

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DialogProps) {
  return (
    <HeadlessDialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm",
          "duration-200 ease-out data-closed:opacity-0",
        )}
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          transition
          className={cn(
            // Hairline ring, never a hard 1px border — see the design system.
            "bg-popover text-popover-foreground ring-border-surface-strong w-full max-w-md rounded-xl p-6 shadow-lg ring-[0.5px]",
            "duration-200 ease-out data-closed:scale-95 data-closed:opacity-0",
            className,
          )}
        >
          {title ? (
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {title}
            </DialogTitle>
          ) : null}
          {description ? (
            <Description className="text-muted-foreground mt-1.5 text-sm">
              {description}
            </Description>
          ) : null}
          {/* Only spaced when this component renders the heading; a caller
              supplying its own header lays out its children itself. */}
          {children ? (
            <div className={cn(title || description ? "mt-4" : "contents")}>
              {children}
            </div>
          ) : null}
        </DialogPanel>
      </div>
    </HeadlessDialog>
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-6 flex items-center justify-end gap-2", className)}
      {...props}
    />
  );
}
