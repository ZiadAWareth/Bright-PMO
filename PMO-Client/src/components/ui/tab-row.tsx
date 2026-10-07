"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabRowItem {
  id: string;
  label: ReactNode;
  /** Optional leading icon element, e.g. `<Layers className="h-4 w-4" />`. */
  icon?: ReactNode;
  /** Optional trailing count pill, e.g. the number of rows behind the tab. */
  count?: number;
}

/**
 * The house tab row, in the underline style.
 *
 * Screens that drive their tabs from local state rather than Radix (`activeTab
 * === tab.id && …`) previously each hand-rolled their own row, and every one of
 * them landed on a filled orange chip for the active tab. This renders the same
 * underline treatment as `TabsList variant="line"` so the two ways of building
 * a tabbed screen look identical, and so brand orange stays reserved for
 * primary actions and the active nav item.
 *
 * `role="tablist"` plus `aria-selected` is deliberate: without it a screen
 * reader announces these as a row of unrelated buttons rather than as a set of
 * views you are choosing between.
 */
export function TabRow({
  tabs,
  value,
  onChange,
  className,
  dense,
}: {
  tabs: TabRowItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  /**
   * Tighter spacing and no icons, for screens with enough tabs that the
   * regular row would need to scroll (e.g. the project detail screen's 11
   * role-driven tabs). Icons are the biggest per-tab cost, so dropping them
   * buys more width back than shrinking gaps or type alone.
   */
  dense?: boolean;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "mb-6 flex w-full items-center overflow-x-auto border-b border-line",
        dense ? "gap-4" : "gap-6",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-1 pt-1.5 text-sm font-medium transition-colors",
              dense ? "pb-2" : "pb-2.5",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-bright after:opacity-0 after:transition-opacity",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bright-soft",
              active
                ? "text-bright after:opacity-100"
                : "text-muted hover:text-ink",
            )}
          >
            {!dense && tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  active ? "bg-bright-soft text-bright-deep" : "bg-surface-2 text-muted",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default TabRow;
