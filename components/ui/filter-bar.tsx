"use client";

import { useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface FilterBarProps {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  /** Right-aligned count, e.g. "12 projects". */
  resultLabel?: string;
  /** Number of filters currently narrowing the list; drives the badge. */
  activeCount?: number;
  onClear?: () => void;
  /** Filter controls. Omit and the Filters button is not rendered at all. */
  children?: ReactNode;
}

/**
 * Search box with a Filters toggle that slides a panel of controls open
 * beneath it.
 *
 * The panel animates on `grid-template-rows` (0fr → 1fr) rather than height, so
 * it expands to whatever the filters actually need without anyone hard-coding a
 * pixel height that breaks when a control is added.
 */
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = "Search…",
  resultLabel,
  activeCount = 0,
  onClear,
  children,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/70"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-[38px] w-full rounded-[10px] border border-border bg-bg-surface-alt pl-9 pr-3 text-[13.5px] text-text-primary transition-colors placeholder:text-text-secondary/60 focus:border-wujha-primary focus:bg-bg-surface focus:outline-none focus:ring-[3px] focus:ring-wujha-primary/20"
          />
        </div>

        {children && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={`inline-flex h-[38px] items-center gap-2 rounded-[10px] border px-3.5 text-[13.5px] font-semibold transition-colors ${
              open || activeCount > 0
                ? "border-wujha-primary bg-wujha-primary/10 text-wujha-primary"
                : "border-border bg-bg-surface text-text-secondary hover:bg-bg-surface-alt"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeCount > 0 && (
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-wujha-primary px-1 text-[10.5px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
        )}

        {resultLabel && (
          <span className="ml-auto text-[12.5px] text-text-secondary/80">
            {resultLabel}
          </span>
        )}
      </div>

      {children && (
        <div
          className={`grid transition-all duration-300 ease-out ${
            open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="rounded-[12px] border border-border bg-bg-surface p-4 shadow-card">
              <div className="flex flex-wrap items-end gap-3">{children}</div>
              {activeCount > 0 && onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] text-text-secondary transition-colors hover:text-text-primary"
                >
                  <X className="h-3 w-3" aria-hidden="true" /> Clear filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A labelled select sized for the FilterBar panel. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="w-48 space-y-1">
      <label className="block text-[11.5px] font-medium text-text-secondary">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-[38px] w-full rounded-[10px] border border-border bg-bg-surface px-3 text-[13.5px] text-text-primary transition-colors focus:border-wujha-primary focus:outline-none focus:ring-[3px] focus:ring-wujha-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A labelled free-text input sized for the FilterBar panel. */
export function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date" | "number";
}) {
  return (
    <div className="w-48 space-y-1">
      <label className="block text-[11.5px] font-medium text-text-secondary">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-[38px] w-full rounded-[10px] border border-border bg-bg-surface px-3 text-[13.5px] text-text-primary transition-colors placeholder:text-text-secondary/60 focus:border-wujha-primary focus:outline-none focus:ring-[3px] focus:ring-wujha-primary/20"
      />
    </div>
  );
}
