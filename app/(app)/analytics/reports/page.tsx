"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
  Table2,
  type LucideIcon,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";

import { generateReport } from "@/lib/reporting/generator";
import { REPORT_TEMPLATES } from "@/lib/reporting/templates";
import type { ReportFormat, ReportTemplate } from "@/lib/reporting/types";

/** Icon + accent per output format, so the file type is readable at a glance. */
const FORMAT_STYLE: Record<
  ReportFormat,
  { icon: LucideIcon; label: string; badge: string; tile: string }
> = {
  pdf: {
    icon: FileText,
    label: "PDF",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    tile: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  },
  excel: {
    icon: FileSpreadsheet,
    label: "Excel",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  powerpoint: {
    icon: Presentation,
    label: "PowerPoint",
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    tile: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  },
  csv: {
    icon: Table2,
    label: "CSV",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    tile: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  },
  dashboard: {
    icon: BarChart3,
    label: "Dashboard",
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
    tile: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
  },
};

const humanise = (token: string) =>
  token.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/**
 * Report templates, ready to download.
 *
 * This screen used to open on a four-tab console (templates / generated /
 * scheduled / analytics) whose figures were hardcoded samples. Templates are
 * the only part backed by a working pipeline — `generateReport` queries live
 * PMO tables and builds the file in the browser — so the screen now leads with
 * them instead of burying them behind a tab.
 */
export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [format, setFormat] = useState("all");
  const [downloading, setDownloading] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      Array.from(new Set(REPORT_TEMPLATES.map((t) => t.category))).sort(),
    [],
  );
  const formats = useMemo(
    () => Array.from(new Set(REPORT_TEMPLATES.map((t) => t.format))).sort(),
    [],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return REPORT_TEMPLATES.filter((template) => {
      const matchesSearch =
        !term ||
        template.name.toLowerCase().includes(term) ||
        template.description.toLowerCase().includes(term) ||
        template.dataSource.some((s) => s.toLowerCase().includes(term));
      const matchesCategory =
        category === "all" || template.category === category;
      const matchesFormat = format === "all" || template.format === format;
      return matchesSearch && matchesCategory && matchesFormat;
    });
  }, [search, category, format]);

  const handleDownload = async (template: ReportTemplate) => {
    setDownloading(template.id);
    try {
      await generateReport(template);
    } finally {
      setDownloading(null);
    }
  };

  const activeCount = (category !== "all" ? 1 : 0) + (format !== "all" ? 1 : 0);

  return (
    <ProtectedRoute>
      <DashboardLayout
        title="Reports"
        subtitle="Pick a template and download it — each one is built from live PMO data at the moment you click."
      >
        <div>
          <div className="mb-4">
            <FilterBar
              search={search}
              onSearch={setSearch}
              searchPlaceholder="Search templates by name, description or data source…"
              resultLabel={`${visible.length} ${visible.length === 1 ? "template" : "templates"}`}
              activeCount={activeCount}
              onClear={() => {
                setCategory("all");
                setFormat("all");
              }}
            >
              <FilterSelect
                label="Category"
                value={category}
                onChange={setCategory}
                options={[
                  { value: "all", label: "All categories" },
                  ...categories.map((c) => ({ value: c, label: humanise(c) })),
                ]}
              />
              <FilterSelect
                label="Format"
                value={format}
                onChange={setFormat}
                options={[
                  { value: "all", label: "All formats" },
                  ...formats.map((f) => ({
                    value: f,
                    label: FORMAT_STYLE[f]?.label ?? humanise(f),
                  })),
                ]}
              />
            </FilterBar>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-[14px] border border-border bg-bg-surface p-10 text-center shadow-card">
              <p className="text-sm text-text-secondary">
                No template matches the current search or filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((template) => {
                const style = FORMAT_STYLE[template.format] ?? FORMAT_STYLE.pdf;
                const Icon = style.icon;
                const isDownloading = downloading === template.id;

                return (
                  <article
                    key={template.id}
                    className="flex flex-col rounded-[14px] border border-border bg-bg-surface p-5 shadow-card transition-all hover:border-wujha-primary/40 hover:shadow-card-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[10px] ${style.tile}`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${style.badge}`}
                      >
                        {style.label}
                      </span>
                    </div>

                    <h2 className="mt-4 text-[15px] font-semibold text-text-primary">
                      {template.name}
                    </h2>
                    <p className="mt-1.5 flex-1 text-[13px]/relaxed text-text-secondary">
                      {template.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-bg-surface-alt px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                        {humanise(template.category)}
                      </span>
                      {template.dataSource.map((source) => (
                        <span
                          key={source}
                          className="inline-flex items-center gap-1 rounded-md bg-bg-surface-alt px-2 py-0.5 text-[11px] text-text-secondary"
                        >
                          <Database className="h-3 w-3" aria-hidden="true" />
                          {humanise(source)}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                      <span className="text-[11.5px] text-text-secondary/80">
                        v{template.version} · {template.createdBy}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownload(template)}
                        disabled={isDownloading}
                        className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-wujha-primary px-4 text-[13px] font-semibold text-white transition-colors hover:bg-wujha-primary-hover disabled:opacity-60"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2
                              className="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                            Building…
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Download
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
