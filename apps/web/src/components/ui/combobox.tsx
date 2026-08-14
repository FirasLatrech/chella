"use client";

import {
  Combobox as HeadlessCombobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from "@headlessui/react";
import {
  AltArrowDownIcon,
  CheckCircleIcon,
} from "@solar-icons/react/bold-duotone";
import { memo, useCallback, useMemo, useState } from "react";
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

export interface ComboboxItem<T> {
  value: T;
  label: string;
}

export interface ComboboxProps<T> {
  value: T | null;
  onChange: (value: T | null) => void;
  items: ComboboxItem<T>[];
  size?: ControlSize;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/*
 * Like Select, the panel is positioned with CSS rather than the `anchor` prop
 * so opening it never triggers a portal + measure pass (which scroll-jumped).
 */
function ComboboxImpl<T>({
  value,
  onChange,
  items,
  size = "md",
  placeholder = "Search…",
  disabled,
  className,
}: ComboboxProps<T>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (query === "") return items;
    const q = query.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  const displayValue = useCallback(
    (v: T | null) => items.find((i) => i.value === v)?.label ?? "",
    [items],
  );

  return (
    <HeadlessCombobox
      value={value}
      onChange={onChange}
      onClose={() => setQuery("")}
      disabled={disabled}
    >
      <div className={cn("relative w-full", className)}>
        <ComboboxInput
          className={cn(
            controlBase,
            "w-full pr-9",
            "border-input bg-background placeholder:text-muted-foreground",
            controlFocus,
            controlDisabled,
            controlSizes[size],
            controlRadius,
          )}
          placeholder={placeholder}
          displayValue={displayValue}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ComboboxButton className="group absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3">
          <AltArrowDownIcon
            size={16}
            className="text-muted-foreground transition-transform duration-150 group-data-open:rotate-180"
          />
        </ComboboxButton>

        <ComboboxOptions
          transition
          portal={false}
          modal={false}
          className={cn(
            "bg-popover text-popover-foreground absolute z-50 mt-1.5 w-full rounded-xl p-1",
            "flex max-h-72 flex-col gap-0.5 overflow-auto",
            "ring-[0.5px] ring-border-surface-strong shadow-lg shadow-black/5",
            "empty:invisible focus:outline-none",
            "origin-top duration-150 ease-out data-closed:scale-95 data-closed:opacity-0",
          )}
        >
          {filtered.map((item) => (
            <ComboboxOption
              key={String(item.value)}
              value={item.value}
              className={cn(controlItemBase, controlItemSizes[size])}
            >
              <span className="truncate">{item.label}</span>
              <CheckCircleIcon
                size={16}
                className="text-brand shrink-0 opacity-0 transition-opacity duration-150 group-data-selected:opacity-100"
              />
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </div>
    </HeadlessCombobox>
  );
}

// memo keeps the combobox from re-rendering on unrelated page state changes.
export const Combobox = memo(ComboboxImpl) as typeof ComboboxImpl;
