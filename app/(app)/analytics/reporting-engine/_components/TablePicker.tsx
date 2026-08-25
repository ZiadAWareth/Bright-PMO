"use client";

import { useMemo, useState } from "react";
import { Database, Search, Table2 } from "lucide-react";

export function TablePicker({
  tables,
  loading,
  onSelect,
}: {
  tables: string[];
  loading: boolean;
  onSelect: (table: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tables;
    return tables.filter((t) => t.toLowerCase().includes(term));
  }, [search, tables]);

  return (
    <section className="rounded-2xl border border-border bg-bg-surface p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wujha-primary/10 text-wujha-primary">
            <Database className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Select a table
            </h2>
            <p className="text-xs text-text-secondary">
              {loading
                ? "Reading the schema…"
                : `${tables.length} table${tables.length === 1 ? "" : "s"} available`}
            </p>
          </div>
        </div>

        <label className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tables…"
            aria-label="Search tables"
            className="h-10 w-full rounded-xl border border-border bg-bg-surface pl-9 pr-3 text-sm text-text-primary transition-colors placeholder:text-text-secondary/60 focus:border-wujha-primary focus:outline-none focus:ring-[3px] focus:ring-wujha-primary/20"
          />
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-bg-surface-alt" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-secondary">
          {tables.length === 0
            ? "The reporting engine returned no tables."
            : `No table matches "${search}".`}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((table) => (
            <li key={table}>
              <button
                type="button"
                onClick={() => onSelect(table)}
                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-bg-surface p-3.5 text-left transition-all hover:border-wujha-primary hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-wujha-primary"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-surface-alt text-text-secondary transition-colors group-hover:bg-wujha-primary group-hover:text-white">
                  <Table2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="truncate text-sm font-medium text-text-primary group-hover:text-wujha-primary">
                  {table}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
