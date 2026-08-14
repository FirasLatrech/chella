import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "brand" | "destructive";

const variants: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border border-border text-foreground",
  brand: "bg-brand/10 text-brand-content border border-brand/20",
  destructive: "bg-destructive text-destructive-foreground",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: ComponentProps<"span"> & { variant?: Variant }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        "w-fit shrink-0 whitespace-nowrap [&_svg]:size-3",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
