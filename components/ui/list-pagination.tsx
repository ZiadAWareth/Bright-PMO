"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page-button sequence with ellipses, e.g. [0,'gap',3,4,5,'gap',19] (0-based). */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
  const out: (number | "gap")[] = [0];
  const start = Math.max(1, page - 1);
  const end = Math.min(pageCount - 2, page + 1);
  if (start > 1) out.push("gap");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pageCount - 2) out.push("gap");
  out.push(pageCount - 1);
  return out;
}

/**
 * List pagination — a "Showing X–Y of Z" summary plus circular numbered page
 * buttons. `page` is 0-based.
 *
 * The summary renders even for a single page so the total count is always
 * visible; only the page buttons are hidden.
 *
 * Named `ListPagination` to stay clear of the shadcn `Pagination` primitive
 * already in `components/ui/pagination.tsx`.
 */
export function ListPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  isFetching = false,
  className,
  noun = "result",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (next: number) => void;
  isFetching?: boolean;
  className?: string;
  noun?: string;
}) {
  const safeCount = Math.max(1, pageCount);
  const clamped = Math.min(Math.max(0, page), safeCount - 1);
  const from = total === 0 ? 0 : clamped * pageSize + 1;
  const to = Math.min(total, (clamped + 1) * pageSize);

  const go = (next: number) => {
    const n = Math.min(Math.max(0, next), safeCount - 1);
    if (n !== clamped) onPageChange(n);
  };

  const numBtn =
    "grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-colors";
  const chevBtn =
    "grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-1 pt-4",
        className,
      )}
      role="navigation"
      aria-label="Pagination"
    >
      <div className="text-[12.5px] text-muted">
        {total === 0 ? (
          `No ${noun}s`
        ) : (
          <>
            Showing{" "}
            <span className="font-semibold tabular-nums text-ink">
              {from.toLocaleString()}
            </span>
            –
            <span className="font-semibold tabular-nums text-ink">
              {to.toLocaleString()}
            </span>{" "}
            of{" "}
            <span className="font-semibold tabular-nums text-ink">
              {total.toLocaleString()}
            </span>
          </>
        )}
        {isFetching && (
          <span className="ml-2 text-faint">· updating…</span>
        )}
      </div>

      {safeCount > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => go(clamped - 1)}
            disabled={clamped === 0}
            aria-label="Previous page"
            className={chevBtn}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageWindow(clamped, safeCount).map((p, i) =>
            p === "gap" ? (
              <span
                key={`gap-${i}`}
                className="grid h-9 w-9 place-items-center text-[13px] text-faint"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => go(p)}
                aria-label={`Page ${p + 1}`}
                aria-current={p === clamped ? "page" : undefined}
                className={cn(
                  numBtn,
                  p === clamped
                    ? "bg-bright text-white shadow-card"
                    : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                {p + 1}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => go(clamped + 1)}
            disabled={clamped >= safeCount - 1}
            aria-label="Next page"
            className={chevBtn}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default ListPagination;
