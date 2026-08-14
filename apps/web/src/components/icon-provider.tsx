"use client";

import { SolarProvider } from "@solar-icons/react";
import type { ReactNode } from "react";

/*
 * Solar icons, Bold Duotone style.
 *
 * `color` stays `currentColor` so icons inherit whatever text colour their
 * container sets — that means our design tokens drive them automatically
 * (text-muted-foreground, text-brand, and so on).
 *
 * The duotone layer is the secondary shape drawn underneath at reduced
 * opacity. Leaving `secondaryColor` as currentColor and dimming it keeps
 * icons monochrome-but-layered, which suits our neutral palette; pass
 * `secondaryColor="var(--brand)"` on an individual icon for an accent.
 */
export function IconProvider({ children }: { children: ReactNode }) {
  return (
    <SolarProvider color="currentColor" size={20} secondaryOpacity={0.35}>
      {children}
    </SolarProvider>
  );
}
