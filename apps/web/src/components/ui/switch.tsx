"use client";

import { Switch as HeadlessSwitch } from "@headlessui/react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
  "aria-label"?: string;
}

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <HeadlessSwitch
      className={cn(
        "group relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
        "border border-transparent transition-colors duration-200 outline-none",
        "bg-input data-checked:bg-brand",
        "data-focus:ring-2 data-focus:ring-ring data-focus:ring-offset-2 data-focus:ring-offset-background",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "no-squircle pointer-events-none block size-4 rounded-full bg-white shadow-sm",
          "translate-x-0.5 transition-transform duration-200 group-data-checked:translate-x-4",
        )}
      />
    </HeadlessSwitch>
  );
}
