/*
 * Compact number formatting for points/reputation — "1049" reads as "1k",
 * GitHub-style. Shared by boards, rails, profile and the header XP chip.
 */
export function formatPoints(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return String(n);
  const fmt = (value: number, suffix: string) => {
    const rounded = Math.round(value * 10) / 10;
    const text =
      rounded >= 10 || Number.isInteger(rounded)
        ? String(Math.round(rounded))
        : rounded.toFixed(1);
    return `${n < 0 ? "-" : ""}${text}${suffix}`;
  };
  if (abs < 1_000_000) return fmt(abs / 1000, "k");
  return fmt(abs / 1_000_000, "M");
}
