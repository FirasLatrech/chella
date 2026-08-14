"use client";

import { Button as HeadlessButton } from "@headlessui/react";
import type { ComponentPropsWithoutRef, ElementType, Ref } from "react";
import { cn } from "@/lib/utils";
import {
  controlBase,
  controlDisabled,
  controlFocus,
  controlGaps,
  controlRadius,
  controlSizes,
  controlSquareSizes,
  type ControlSize,
} from "./control";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "brand" | "destructive";
type Shape = "squircle" | "pill";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/80 data-active:bg-primary/80",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 data-active:bg-secondary/70",
  outline:
    "border border-border bg-background hover:bg-accent hover:text-accent-foreground data-active:bg-accent/80",
  ghost:
    "hover:bg-accent hover:text-accent-foreground data-active:bg-accent/80",
  brand:
    "bg-brand text-brand-foreground hover:bg-brand-content data-active:bg-brand-content",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 data-active:bg-destructive/80",
};

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: Variant;
  size?: ControlSize;
  shape?: Shape;
  /** Square icon-only button; height matches the equivalent text button. */
  iconOnly?: boolean;
  /**
   * Render as another element — e.g. `as={Link} href="/"` for a button that
   * navigates. Headless UI forwards the extra props to that component.
   */
  as?: ElementType;
  href?: string;
  /** React 19 passes ref as a normal prop; Headless UI forwards it. */
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  shape = "squircle",
  iconOnly = false,
  ...props
}: ButtonProps) {
  return (
    <HeadlessButton
      className={cn(
        controlBase,
        "cursor-pointer justify-center select-none",
        // Aside sets the label to weight 450 — between normal and medium.
        "font-[450]",
        // Tactile press feedback, straight from the reference.
        "active:scale-95 data-disabled:active:scale-100",
        controlFocus,
        controlDisabled,
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variants[variant],
        iconOnly ? controlSquareSizes[size] : controlSizes[size],
        controlGaps[size],
        shape === "pill" ? "rounded-full" : controlRadius,
        className,
      )}
      {...props}
    />
  );
}
