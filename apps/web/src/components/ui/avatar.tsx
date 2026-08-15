import { cn } from "@/lib/utils";

/*
 * Sky avatars.
 *
 * Rather than shipping a placeholder image per user, every avatar is a
 * different window onto the same sky artwork. A hash of the identifier picks
 * the crop position and zoom, so a given user always gets the same patch of
 * sky — stable across renders, sessions and machines, with no extra assets.
 */
const IMAGE = "/images/sky-background.webp";

/** FNV-1a — small, fast, and well distributed for short strings. */
function hash(input: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function skyPosition(seed: string) {
  const h = hash(seed);
  // Three independent slices of the hash so position and zoom don't correlate.
  const x = h % 100;
  const y = Math.floor(h / 100) % 100;
  const zoom = 180 + ((Math.floor(h / 10000) % 90) - 45); // 135–225%
  return {
    backgroundImage: `url(${IMAGE})`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundSize: `${zoom}%`,
  };
}

const sizes: Record<AvatarSize, string> = {
  xs: "size-6 rounded-md",
  sm: "size-7",
  md: "size-8",
  lg: "size-10",
  xl: "size-12 rounded-xl",
};

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  /** Stable identifier — a handle or user id. Drives which patch of sky. */
  seed: string;
  /** Uploaded photo. Falls back to the sky crop when absent. */
  src?: string;
  size?: AvatarSize;
  className?: string;
  ring?: boolean;
}

export function Avatar({
  seed,
  src,
  size = "md",
  className,
  ring = true,
}: AvatarProps) {
  return (
    <span
      style={
        src
          ? { backgroundImage: `url(${src})`, backgroundPosition: "center" }
          : skyPosition(seed)
      }
      aria-hidden="true"
      className={cn(
        // Rounded square, not a circle — squircle shaping comes from the
        // global rounded-* rule, matching the rest of the system.
        "block shrink-0 overflow-hidden rounded-lg",
        "bg-secondary bg-cover bg-no-repeat",
        ring && "ring-border-surface-strong ring-[0.5px]",
        sizes[size],
        className,
      )}
    />
  );
}

