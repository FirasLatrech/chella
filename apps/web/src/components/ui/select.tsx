"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react";
import {
  AltArrowDownIcon,
  CheckCircleIcon,
} from "@solar-icons/react/bold-duotone";
import { memo, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  controlBase,
  controlDisabled,
  controlFocus,
  controlItemBase,
  controlItemSizes,
  controlRadius,
  controlSizes,
  type ControlSize,
} from "./control";

export interface SelectOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  size?: ControlSize;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/*
 * The options panel is positioned with plain CSS (absolute, inside the
 * relative wrapper) rather than Headless UI's `anchor` prop. `anchor` portals
 * the panel to document.body and measures it on open, which caused a visible
 * scroll jump. Staying in the DOM keeps opening cheap and stable.
 */
function SelectImpl<T>({
  value,
  onChange,
  options,
  size = "md",
  placeholder = "Select…",
  disabled,
  className,
}: SelectProps<T>) {
  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={cn("relative w-full", className)}>
        <ListboxButton
          className={cn(
            controlBase,
            "group w-full cursor-pointer justify-between gap-2 text-left",
            "border-input bg-background",
            controlFocus,
            controlDisabled,
            controlSizes[size],
            controlRadius,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <AltArrowDownIcon
            size={16}
            className="text-muted-foreground shrink-0 transition-transform duration-150 group-data-open:rotate-180"
          />
        </ListboxButton>

        <ListboxOptions
          transition
          portal={false}
          modal={false}
          className={cn(
            "bg-popover text-popover-foreground absolute z-50 mt-1.5 w-full rounded-xl p-1",
            "flex max-h-72 flex-col gap-0.5 overflow-auto",
            "ring-[0.5px] ring-border-surface-strong shadow-lg shadow-black/5",
            "focus:outline-none",
            "origin-top duration-150 ease-out data-closed:scale-95 data-closed:opacity-0",
          )}
        >
          {options.map((option) => (
            <ListboxOption
              key={String(option.value)}
              value={option.value}
              disabled={option.disabled}
              className={cn(controlItemBase, controlItemSizes[size])}
            >
              <span className="truncate">{option.label}</span>
              <CheckCircleIcon
                size={16}
                className="text-brand shrink-0 opacity-0 transition-opacity duration-150 group-data-selected:opacity-100"
              />
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}

// memo keeps the select from re-rendering when unrelated page state changes.
export const Select = memo(SelectImpl) as typeof SelectImpl;

/** Dropdown menu trigger — same geometry as Button/Input/Select. */
export function DropdownTrigger({
  className,
  children,
  size = "md",
}: {
  className?: string;
  children?: ReactNode;
  size?: ControlSize;
}) {
  return (
    <span
      className={cn(
        controlBase,
        "cursor-pointer justify-between gap-2",
        "border-input bg-background",
        controlSizes[size],
        controlRadius,
        className,
      )}
    >
      {children}
      <AltArrowDownIcon size={16} className="text-muted-foreground shrink-0" />
    </span>
  );
}
