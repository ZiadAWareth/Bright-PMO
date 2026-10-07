"use client";

import { ArrowLeft, ArrowRight, Filter, Link2, ListChecks } from "lucide-react";
import type { ReportColumn } from "./types";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  table: string;
  columns: ReportColumn[];
  loading: boolean;
  selectedColumns: string[];
  onToggleColumn: (name: string) => void;
  onSelectAll: () => void;
  onClear: () => void;

  joinableTables: string[];
  selectedRelatedTables: string[];
  relatedColumns: Record<string, ReportColumn[]>;
  selectedRelatedColumns: Record<string, string[]>;
  loadingRelated: Record<string, boolean>;
  onToggleRelatedTable: (table: string) => void;
  onToggleRelatedColumn: (table: string, column: string) => void;

  whereClause: string;
  onWhereClauseChange: (value: string) => void;

  onBack: () => void;
  onNext: () => void;
}

export function ColumnConfigurator({
  table,
  columns,
  loading,
  selectedColumns,
  onToggleColumn,
  onSelectAll,
  onClear,
  joinableTables,
  selectedRelatedTables,
  relatedColumns,
  selectedRelatedColumns,
  loadingRelated,
  onToggleRelatedTable,
  onToggleRelatedColumn,
  whereClause,
  onWhereClauseChange,
  onBack,
  onNext,
}: Props) {
  const relatedCount = Object.values(selectedRelatedColumns).flat().length;

  return (
    <div className="space-y-6">
      {/* Primary columns */}
      <section className="rounded-2xl border border-border bg-bg-surface p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bright-primary/10 text-bright-primary">
              <ListChecks className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Columns from <span className="text-bright-primary">{table}</span>
              </h2>
              <p className="text-xs text-text-secondary">
                {selectedColumns.length} of {columns.length} selected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              disabled={loading || columns.length === 0}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-bright-primary hover:text-bright-primary disabled:opacity-50"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={selectedColumns.length === 0}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-bright-primary hover:text-bright-primary disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-bg-surface-alt" />
            ))}
          </div>
        ) : columns.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            No columns returned for this table.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {columns.map((column) => {
              const checked = selectedColumns.includes(column.name);
              return (
                <li key={column.name}>
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      checked
                        ? "border-bright-primary/50 bg-bright-primary/5"
                        : "border-border hover:bg-bg-surface-alt"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleColumn(column.name)}
                      className="h-4 w-4 shrink-0 rounded border-border accent-bright-primary"
                    />
                    <span className="min-w-0 flex-1 truncate text-text-primary">
                      {column.name}
                    </span>
                    {column.type && (
                      <span className="shrink-0 rounded bg-bg-surface-alt px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary">
                        {column.type}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Related tables (joins) */}
      <section className="rounded-2xl border border-border bg-bg-surface p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bright-secondary/10 text-bright-secondary">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Related tables
            </h2>
            <p className="text-xs text-text-secondary">
              {joinableTables.length === 0
                ? "No foreign-key relationships found for this table"
                : `${joinableTables.length} joinable · ${relatedCount} column${relatedCount === 1 ? "" : "s"} selected`}
            </p>
          </div>
        </div>

        {joinableTables.length > 0 && (
          <div className="space-y-3">
            {joinableTables.map((related) => {
              const selected = selectedRelatedTables.includes(related);
              const cols = relatedColumns[related] ?? [];
              const picked = selectedRelatedColumns[related] ?? [];

              return (
                <div key={related} className="rounded-xl border border-border">
                  <label className="flex cursor-pointer items-center gap-2.5 px-3.5 py-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleRelatedTable(related)}
                      className="h-4 w-4 shrink-0 rounded border-border accent-bright-primary"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                      {related}
                    </span>
                    {loadingRelated[related] && (
                      <Spinner size={16} className="text-text-secondary" />
                    )}
                    {selected && !loadingRelated[related] && (
                      <span className="shrink-0 text-xs text-text-secondary">
                        {picked.length}/{cols.length}
                      </span>
                    )}
                  </label>

                  {selected && cols.length > 0 && (
                    <ul className="grid grid-cols-1 gap-2 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {cols.map((column) => {
                        const checked = picked.includes(column.name);
                        return (
                          <li key={column.name}>
                            <label
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[13px] transition-colors ${
                                checked
                                  ? "border-bright-primary/50 bg-bright-primary/5"
                                  : "border-border hover:bg-bg-surface-alt"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  onToggleRelatedColumn(related, column.name)
                                }
                                className="h-3.5 w-3.5 shrink-0 rounded border-border accent-bright-primary"
                              />
                              <span className="truncate text-text-primary">
                                {column.name}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Filter */}
      <section className="rounded-2xl border border-border bg-bg-surface p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-surface-alt text-text-secondary">
            <Filter className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Filter <span className="font-normal text-text-secondary">(optional)</span>
            </h2>
            <p className="text-xs text-text-secondary">
              A SQL <code className="font-mono">WHERE</code> condition, without the
              keyword
            </p>
          </div>
        </div>

        <input
          type="text"
          value={whereClause}
          onChange={(e) => onWhereClauseChange(e.target.value)}
          placeholder="status = 'execution' AND budget_amount &gt; 100000"
          className="h-11 w-full rounded-xl border border-border bg-bg-surface px-3.5 font-mono text-sm text-text-primary transition-colors placeholder:font-sans placeholder:text-text-secondary/60 focus:border-bright-primary focus:outline-none focus:ring-[3px] focus:ring-bright-primary/20"
        />
      </section>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-medium text-text-secondary transition-colors hover:border-bright-primary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={selectedColumns.length === 0}
          className="group inline-flex h-11 items-center gap-2 rounded-xl bg-bright-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-bright-primary-hover disabled:opacity-50"
        >
          Continue
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
