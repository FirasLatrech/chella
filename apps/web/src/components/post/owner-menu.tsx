"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useState } from "react";
import {
  MenuDotsIcon,
  PenNewSquareIcon,
  TrashBinTrashIcon,
} from "@solar-icons/react/bold-duotone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { controlItemBase, controlItemSizes } from "@/components/ui/control";

/*
 * Edit / delete affordance for content you wrote. Deletion is irreversible,
 * so it always routes through a confirmation dialog naming what will go —
 * never a one-click destructive menu item.
 */
export function OwnerMenu({
  onEdit,
  onDelete,
  deleting,
  what,
  className,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
  /** What the confirmation names, e.g. "post" or "reply". */
  what: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Menu>
        <div className={cn("relative", className)}>
          <MenuButton
            aria-label={`${what} actions`}
            onClick={(e: React.MouseEvent) => {
              // Rows can be links; never navigate when opening the menu.
              e.preventDefault();
              e.stopPropagation();
            }}
            className={cn(
              "text-muted-foreground/70 hover:text-foreground hover:bg-accent grid size-7 cursor-pointer place-items-center rounded-lg transition-colors",
              "data-open:bg-accent data-open:text-foreground",
            )}
          >
            <MenuDotsIcon size={15} />
          </MenuButton>

          <MenuItems
            transition
            portal={false}
            modal={false}
            anchor={false}
            className={cn(
              "bg-popover text-popover-foreground absolute right-0 z-50 mt-1 w-40 rounded-xl p-1",
              "ring-border-surface-strong shadow-lg shadow-black/5 ring-[0.5px]",
              "flex flex-col gap-0.5 focus:outline-none",
              "origin-top-right duration-150 ease-out data-closed:scale-95 data-closed:opacity-0",
            )}
          >
            <MenuItem>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                className={cn(controlItemBase, controlItemSizes.md, "w-full gap-2.5")}
              >
                <PenNewSquareIcon
                  size={15}
                  className="text-muted-foreground shrink-0"
                />
                <span className="flex-1 text-left">Edit</span>
              </button>
            </MenuItem>
            <MenuItem>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirming(true);
                }}
                className={cn(
                  controlItemBase,
                  controlItemSizes.md,
                  "text-destructive w-full gap-2.5",
                )}
              >
                <TrashBinTrashIcon size={15} className="shrink-0" />
                <span className="flex-1 text-left">Delete</span>
              </button>
            </MenuItem>
          </MenuItems>
        </div>
      </Menu>

      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle className="text-base font-semibold tracking-tight">
          Delete this {what}?
        </DialogTitle>
        <p className="text-muted-foreground mt-1.5 text-sm text-pretty">
          This can&rsquo;t be undone. Replies and votes on it go too, and the
          points it earned leave your reputation.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleting}
            onClick={() => {
              setConfirming(false);
              onDelete();
            }}
          >
            {deleting ? "Deleting…" : `Delete ${what}`}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
