/**
 * Shared sizing for every interactive control.
 *
 * Buttons, inputs, selects, comboboxes and dropdown triggers all import from
 * here so a row of mixed controls lines up exactly — same height, same
 * horizontal padding, same radius, same type scale, at every breakpoint.
 *
 * Never hardcode height, padding or radius on a control — add a size here.
 */
export type ControlSize = "sm" | "md" | "lg";

/** Height + horizontal padding + font size. Grows one step at `md`. */
export const controlSizes: Record<ControlSize, string> = {
  sm: "h-8 px-2.5 text-xs md:h-9 md:px-2.5 md:text-sm",
  md: "h-9 px-2.5 text-sm md:h-10 md:px-3 md:text-base",
  lg: "h-11 px-4 text-base md:h-12 md:px-5 md:text-base",
};

/** Square controls (icon buttons) — matches the heights above. */
export const controlSquareSizes: Record<ControlSize, string> = {
  sm: "size-8 md:size-9",
  md: "size-9 md:size-10",
  lg: "size-11 md:size-12",
};

/** Gap between an icon and its label, scaled to the control. */
export const controlGaps: Record<ControlSize, string> = {
  sm: "gap-1.5",
  md: "gap-1.5",
  lg: "gap-2",
};

/**
 * Dropdown option/menu-item sizing.
 *
 * Deliberately more compact than the trigger — a list of options reads better
 * dense than at full control height. Horizontal padding still tracks the
 * control so labels align with the trigger's text.
 */
export const controlItemSizes: Record<ControlSize, string> = {
  sm: "px-2.5 py-1 text-xs md:text-sm",
  md: "px-2.5 py-1.5 text-sm md:px-3",
  lg: "px-4 py-2 text-base md:px-5",
};

/** Corner radius. Squircle shaping comes from globals.css. */
export const controlRadius = "rounded-xl";

/** Radius for items nested inside a panel — one step down from the panel. */
export const controlItemRadius = "rounded-lg";

/**
 * Focus ring, shared so keyboard focus looks identical across controls.
 *
 * `data-open` is included so a trigger keeps the ring while its panel is
 * open — once the panel mounts, focus moves into the listbox and the trigger
 * would otherwise look inactive while clearly being the active control.
 */
export const controlFocus =
  "data-focus:ring-3 data-focus:ring-ring/50 data-focus:border-ring " +
  "data-open:ring-3 data-open:ring-ring/50 data-open:border-ring";

/** Disabled treatment. */
export const controlDisabled =
  "data-disabled:cursor-not-allowed data-disabled:opacity-50";

/** Base layout shared by every control. */
export const controlBase =
  "inline-flex shrink-0 items-center whitespace-nowrap border border-transparent " +
  "bg-clip-padding transition-all duration-150 outline-none";

/**
 * Dropdown item interaction.
 *
 * The highlight is a `::before` layer rather than a background-colour swap, so
 * moving between items eases in and out instead of snapping. It sits behind
 * the content (`-z-10`) and is inset slightly so the highlight reads as a
 * rounded pill rather than a full-bleed band.
 */
export const controlItemBase =
  "group relative isolate flex cursor-pointer items-center justify-between gap-2 " +
  "select-none outline-none " +
  "before:absolute before:inset-0 before:-z-10 before:rounded-lg " +
  "before:bg-accent before:opacity-0 before:scale-[0.98] " +
  "before:transition before:duration-150 before:ease-out " +
  "data-focus:before:opacity-100 data-focus:before:scale-100 " +
  "data-disabled:cursor-not-allowed data-disabled:opacity-50 " +
  "data-disabled:before:opacity-0";
