"use client";

import {
  Input as HeadlessInput,
  Textarea as HeadlessTextarea,
  Field,
  Label,
  Description,
} from "@headlessui/react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  controlBase,
  controlDisabled,
  controlFocus,
  controlRadius,
  controlSizes,
  type ControlSize,
} from "./control";

// `size` is omitted from the native input attributes so it means our control
// scale here, not the legacy numeric character-width attribute.
export interface InputProps
  extends Omit<ComponentPropsWithoutRef<"input">, "size"> {
  size?: ControlSize;
}

export function Input({ className, size = "md", ...props }: InputProps) {
  return (
    <HeadlessInput
      className={cn(
        controlBase,
        // Inputs stretch; buttons don't.
        "w-full shrink",
        "border-input bg-background placeholder:text-muted-foreground",
        controlFocus,
        controlDisabled,
        "data-invalid:border-destructive data-invalid:ring-destructive/30",
        controlSizes[size],
        controlRadius,
        className,
      )}
      {...props}
    />
  );
}

/** Multi-line sibling of Input — same border, focus and disabled treatment. */
export function Textarea({
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"textarea">, "size">) {
  return (
    <HeadlessTextarea
      className={cn(
        "border-input bg-background placeholder:text-muted-foreground w-full rounded-xl border px-3 py-2 text-sm",
        "min-h-24 resize-none transition-all outline-none",
        controlFocus,
        controlDisabled,
        "data-invalid:border-destructive data-invalid:ring-destructive/30",
        className,
      )}
      {...props}
    />
  );
}

export function InputField({
  label,
  description,
  className,
  children,
}: {
  label?: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Field className={cn("flex flex-col gap-2", className)}>
      {label ? <Label className="text-sm font-medium">{label}</Label> : null}
      {children}
      {description ? (
        <Description className="text-muted-foreground text-xs">
          {description}
        </Description>
      ) : null}
    </Field>
  );
}
