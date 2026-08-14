"use client";

import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "@headlessui/react";
import { motion } from "motion/react";
import {
  createContext,
  useContext,
  useId,
  Fragment,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export { TabGroup, TabPanels, TabPanel };

/*
 * The selected pill is one shared element that slides between tabs via
 * Motion's layoutId (FLIP), so switching animates instead of snapping.
 * The id is namespaced per Tabs instance — two tab groups on one page must
 * not trade a pill back and forth.
 */
const TabsId = createContext("tabs");

export function Tabs({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <TabsId.Provider value={id}>
      <TabList
        className={cn(
          "bg-secondary isolate inline-flex items-center gap-0.5 rounded-lg p-0.5",
          className,
        )}
      >
        {children}
      </TabList>
    </TabsId.Provider>
  );
}

export function TabItem({
  className,
  children,
  count,
}: {
  className?: string;
  children?: ReactNode;
  count?: number;
}) {
  const id = useContext(TabsId);

  return (
    <Tab as={Fragment}>
      {({ selected, focus }) => (
        <button
          className={cn(
            "relative cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium outline-none",
            "flex items-center gap-1.5 transition-colors duration-200",
            selected
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
            focus && "ring-ring/50 ring-2",
            className,
          )}
        >
          {selected ? (
            <motion.span
              layoutId={`tab-pill-${id}`}
              aria-hidden="true"
              className="bg-primary absolute inset-0 -z-10 rounded-md"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          ) : null}
          <span className="relative">{children}</span>
          {count !== undefined ? (
            <span
              className={cn(
                "relative rounded-full px-1 text-[10px] tabular-nums",
                selected
                  ? "bg-primary-foreground/15 text-primary-foreground/80"
                  : "bg-foreground/8 text-muted-foreground",
              )}
            >
              {count}
            </span>
          ) : null}
        </button>
      )}
    </Tab>
  );
}
