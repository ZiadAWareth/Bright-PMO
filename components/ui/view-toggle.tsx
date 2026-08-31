"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ListViewMode = "grid" | "list";

/**
 * Segmented grid/list switch for list screens.
 *
 * Both layouts show the same rows, so this is a view preference rather than a
 * filter — which is why it sits with the page actions and not inside the
 * FilterBar panel. Icon-only to keep the header row short, with the mode named
 * in `aria-label` and `title` so the control is not colour-and-shape only.
 */
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ListViewMode;
  onChange: (mode: ListViewMode) => void;
  className?: string;
}) {
  const modes: { mode: ListViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { mode: "grid", icon: LayoutGrid, label: "Grid view" },
    { mode: "list", icon: List, label: "List view" },
  ];

  return (
    <div
      role="group"
      aria-label="View mode"
      className={cn(
        "inline-flex h-[38px] items-center gap-0.5 rounded-[10px] border border-line bg-surface p-0.5",
        className,
      )}
    >
      {modes.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-label={label}
          aria-pressed={value === mode}
          title={label}
          className={cn(
            "grid h-[32px] w-[34px] place-items-center rounded-[8px] transition-colors",
            value === mode
              ? "bg-bright text-white"
              : "text-muted hover:bg-surface-2 hover:text-ink",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export default ViewToggle;
