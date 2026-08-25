"use client";

import { ArrowLeft, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

export function GeneratePanel({
  table,
  selectedColumns,
  relatedTables,
  relatedColumnCount,
  whereClause,
  generating,
  onBack,
  onGenerate,
}: {
  table: string;
  selectedColumns: string[];
  relatedTables: string[];
  relatedColumnCount: number;
  whereClause: string;
  generating: "pdf" | "excel" | null;
  onBack: () => void;
  onGenerate: (format: "pdf" | "excel") => void;
}) {
  const summary = [
    { label: "Primary table", value: table },
    { label: "Columns", value: `${selectedColumns.length} selected` },
    {
      label: "Joined tables",
      value:
        relatedTables.length === 0
          ? "None"
          : `${relatedTables.join(", ")} · ${relatedColumnCount} column${relatedColumnCount === 1 ? "" : "s"}`,
    },
    { label: "Filter", value: whereClause.trim() || "None" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-bg-surface p-6">
        <h2 className="text-base font-semibold text-text-primary">
          Report summary
        </h2>
        <dl className="mt-4 divide-y divide-border">
          {summary.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4"
            >
              <dt className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                {row.label}
              </dt>
              <dd className="min-w-0 break-words text-sm text-text-primary">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {selectedColumns.map((c) => (
            <span
              key={c}
              className="rounded-md bg-bg-surface-alt px-2 py-1 font-mono text-[11px] text-text-secondary"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg-surface p-6">
        <h2 className="text-base font-semibold text-text-primary">Export</h2>
        <p className="mt-1 text-xs text-text-secondary">
          The reporting engine builds the file and it downloads straight away.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onGenerate("pdf")}
            disabled={generating !== null}
            className="group flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-all hover:border-wujha-primary hover:shadow-sm disabled:opacity-60"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {generating === "pdf" ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <FileText className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-text-primary group-hover:text-wujha-primary">
                {generating === "pdf" ? "Generating…" : "Download PDF"}
              </span>
              <span className="block text-xs text-text-secondary">
                Formatted document for circulation
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onGenerate("excel")}
            disabled={generating !== null}
            className="group flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-all hover:border-wujha-primary hover:shadow-sm disabled:opacity-60"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              {generating === "excel" ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-text-primary group-hover:text-wujha-primary">
                {generating === "excel" ? "Generating…" : "Download Excel"}
              </span>
              <span className="block text-xs text-text-secondary">
                Raw rows for further analysis
              </span>
            </span>
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-medium text-text-secondary transition-colors hover:border-wujha-primary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to columns
      </button>
    </div>
  );
}
