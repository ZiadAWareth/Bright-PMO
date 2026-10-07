"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Presentation,
  Table2,
  type LucideIcon,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import {
  EmptyState,
  EntityCard,
  EntityCardFooter,
  EntityCardHeader,
  EntityStat,
  EntityStats,
} from "@/components/ui/entity-card";
import {
  ListCard,
  ListHead,
  ListMessage,
  ListRow,
  StatusBadge,
} from "@/components/ui/form-shell";
import { ListPagination } from "@/components/ui/list-pagination";
import { ViewToggle, type ListViewMode } from "@/components/ui/view-toggle";

import { generateReport } from "@/lib/reporting/generator";
import { REPORT_TEMPLATES } from "@/lib/reporting/templates";
import type { ReportFormat, ReportTemplate } from "@/lib/reporting/types";
import type { BadgeTone } from "@/components/ui/form-shell";
import { Spinner } from "@/components/ui/spinner";

const PAGE_SIZE = 12;

/*
 * Six columns, not seven: "Version" was its own column for a two-character
 * value, which cost more width than it earned. It now rides along with the
 * owner, the way the card footer already prints it.
 */
const TEMPLATE_COLUMNS = [
  "Template",
  "Category",
  "Format",
  "Data sources",
  "Owner",
];

/**
 * Icon and badge tone per output format, so the file type is readable at a
 * glance in both views.
 *
 * The tone comes from the shared `BadgeTone` scale rather than a per-screen
 * Tailwind class map: these are the same four colours every other list screen
 * uses for status, so they should be spelled the same way.
 */
const FORMAT_STYLE: Record<
  ReportFormat,
  { icon: LucideIcon; label: string; tone: BadgeTone }
> = {
  pdf: { icon: FileText, label: "PDF", tone: "danger" },
  excel: { icon: FileSpreadsheet, label: "Excel", tone: "success" },
  powerpoint: { icon: Presentation, label: "PowerPoint", tone: "brand" },
  csv: { icon: Table2, label: "CSV", tone: "info" },
  dashboard: { icon: BarChart3, label: "Dashboard", tone: "neutral" },
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
 *
 * Structurally it follows the same shape as every other list screen: filter
 * bar, a grid/table toggle, and pagination. Templates are a fixed set today, so
 * the pagination rarely does anything — but a screen that looks like the others
 * and behaves like them is worth more than one that saves a few lines by being
 * special.
 */
export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [format, setFormat] = useState("all");
  const [view, setView] = useState<ListViewMode>("grid");
  const [page, setPage] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(REPORT_TEMPLATES.map((t) => t.category))).sort(),
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

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Filtering changes what "page 1" means, so reset rather than stranding the
  // user on a page index that no longer has rows.
  useEffect(() => setPage(0), [search, category, format, view]);

  const handleDownload = async (template: ReportTemplate) => {
    setDownloading(template.id);
    try {
      await generateReport(template);
    } finally {
      setDownloading(null);
    }
  };

  const activeCount = (category !== "all" ? 1 : 0) + (format !== "all" ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setFormat("all");
  };

  /** The download control, shared by both views so they cannot drift apart. */
  const downloadButton = (template: ReportTemplate, compact = false) => {
    const isDownloading = downloading === template.id;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void handleDownload(template);
        }}
        disabled={isDownloading}
        className={
          compact
            ? "inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-line px-2.5 text-[12.5px] font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
            : "inline-flex h-9 items-center gap-2 rounded-[10px] bg-bright px-4 text-[13px] font-semibold text-white transition-colors hover:bg-bright-deep disabled:opacity-60"
        }
      >
        {isDownloading ? (
          <>
            <Spinner size={compact ? 14 : 16} />
            {compact ? "…" : "Building…"}
          </>
        ) : (
          <>
            <Download
              className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
              aria-hidden="true"
            />
            Download
          </>
        )}
      </button>
    );
  };

  return (
    <DashboardLayout
      title="Reports"
      subtitle="Pick a template and download it — each one is built from live PMO data at the moment you click."
      actions={<ViewToggle value={view} onChange={setView} />}
    >
      <div className="space-y-6">
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search templates by name, description or data source…"
          resultLabel={`${visible.length} ${
            visible.length === 1 ? "template" : "templates"
          }`}
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

        {visible.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="No templates found"
            message="No template matches the current search or filter."
            action={
              <button
                type="button"
                onClick={clearFilters}
                className="text-[13px] font-semibold text-bright hover:text-bright-deep"
              >
                Clear all filters
              </button>
            }
          />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {paged.map((template) => {
              const style = FORMAT_STYLE[template.format] ?? FORMAT_STYLE.pdf;

              return (
                <EntityCard key={template.id}>
                  <EntityCardHeader
                    title={template.name}
                    subtitle={template.description}
                    badges={
                      <StatusBadge label={style.label} tone={style.tone} />
                    }
                  />

                  <EntityStats>
                    <EntityStat icon={<Database className="h-3.5 w-3.5" />}>
                      {template.dataSource.map(humanise).join(", ") || "—"}
                    </EntityStat>
                    <EntityStat icon={<BarChart3 className="h-3.5 w-3.5" />}>
                      {humanise(template.category)}
                    </EntityStat>
                  </EntityStats>

                  <EntityCardFooter
                    actions={downloadButton(template)}
                  >
                    <span className="text-[11.5px] text-muted">
                      v{template.version} · {template.createdBy}
                    </span>
                  </EntityCardFooter>
                </EntityCard>
              );
            })}
          </div>
        ) : (
          <ListCard>
            <table className="w-full border-collapse">
              <ListHead columns={TEMPLATE_COLUMNS} />
              <tbody>
                {paged.length === 0 ? (
                  <ListMessage colSpan={TEMPLATE_COLUMNS.length + 1}>
                    No templates on this page.
                  </ListMessage>
                ) : (
                  paged.map((template) => {
                    const style =
                      FORMAT_STYLE[template.format] ?? FORMAT_STYLE.pdf;

                    return (
                      <ListRow key={template.id}>
                        <td className="max-w-[320px] px-4 py-3">
                          <div className="truncate text-[13.5px] font-medium text-ink">
                            {template.name}
                          </div>
                          <div
                            className="truncate text-[12.5px] text-muted"
                            title={template.description}
                          >
                            {template.description}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13.5px] text-ink-2">
                          {humanise(template.category)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge label={style.label} tone={style.tone} />
                        </td>
                        <td className="max-w-[200px] px-4 py-3 text-[13.5px] text-ink-2">
                          <span
                            className="block truncate"
                            title={template.dataSource.map(humanise).join(", ")}
                          >
                            {template.dataSource.map(humanise).join(", ") || (
                              <span className="text-faint">—</span>
                            )}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13.5px] text-ink-2">
                          {template.createdBy}
                          <span className="text-muted"> · v{template.version}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {downloadButton(template, true)}
                        </td>
                      </ListRow>
                    );
                  })
                )}
              </tbody>
            </table>
          </ListCard>
        )}

        {visible.length > 0 && (
          <ListPagination
            page={page}
            pageCount={pageCount}
            total={visible.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            noun="template"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
