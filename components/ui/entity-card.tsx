"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The card shell used by every grid view.
 *
 * Hover lifts the card a half-step and warms the border rather than growing a
 * heavy shadow — a grid of twelve cards each scaling on hover reads as noise,
 * and `translate`/`box-shadow` stay off the layout path so a wall of cards does
 * not thrash on mouse move.
 *
 * `selected` is a ring rather than a background wash so the card's own status
 * colours keep meaning the same thing whether or not it is ticked.
 */
export function EntityCard({
  onClick,
  selected,
  children,
  className,
}: {
  onClick?: () => void;
  selected?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-[14px] border bg-surface p-5 shadow-card transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-bright/50 hover:shadow-card-lg",
        selected ? "border-bright ring-2 ring-bright-soft" : "border-line",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * Card title with the status pills beside it.
 *
 * The title clamps to two lines so a long project name cannot push the metrics
 * of one card out of alignment with its neighbours in the grid.
 */
export function EntityCardHeader({
  title,
  subtitle,
  badges,
}: {
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <div className="mb-3">
      <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-bright">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
          {subtitle}
        </p>
      )}
      {badges && <div className="mt-2 flex flex-wrap items-center gap-1.5">{badges}</div>}
    </div>
  );
}

/**
 * A labelled progress bar.
 *
 * `tone` colours the fill by meaning — budget burn goes amber then red as it
 * approaches and passes its ceiling — and the percentage is always printed
 * beside the bar, so the reading never depends on distinguishing the colours.
 */
export function EntityProgress({
  label,
  value,
  display,
  tone = "brand",
}: {
  label: string;
  /** 0–100. Values above 100 clamp the bar but not the printed figure. */
  value: number;
  /** Overrides the printed figure, e.g. a currency amount. */
  display?: ReactNode;
  tone?: "brand" | "success" | "warning" | "danger";
}) {
  const fill = {
    brand: "bg-bright",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  }[tone];

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11.5px] font-medium text-muted">{label}</span>
        <span className="text-[11.5px] font-semibold tabular-nums text-ink">
          {display ?? `${Math.round(value)}%`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full transition-all duration-300", fill)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

/** A row of compact icon+value stats, e.g. "12 projects · OMR 4.2M". */
export function EntityStats({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
      {children}
    </div>
  );
}

/** One stat inside `EntityStats`. */
export function EntityStat({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span>{children}</span>
    </span>
  );
}

/**
 * The card's bottom rule: owner on the left, actions on the right.
 *
 * Actions stay at full opacity rather than fading in on hover. Hover-only
 * controls are invisible to touch users and to anyone scanning for what a card
 * can do, which is the failure mode the old cards had.
 */
export function EntityCardFooter({
  children,
  actions,
}: {
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-2 pt-3">
      <div className="min-w-0">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
    </div>
  );
}

/** The centred "nothing here" panel shown when a grid or table has no rows. */
export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line bg-surface px-6 py-16 text-center">
      {icon && <div className="mb-4 text-faint">{icon}</div>}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {message && (
        <p className="mt-1.5 max-w-sm text-[13px] text-muted">{message}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Tones for the summary strip. Keyed by meaning so the colour lives here only. */
const STAT_TONE = {
  neutral: "text-muted",
  brand: "text-bright",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
} as const;

export type StatTone = keyof typeof STAT_TONE;

/**
 * The summary strip above a list screen.
 *
 * Several screens hand-rolled this out of `Card`/`CardHeader`/`CardContent`
 * with their own paddings and type sizes, so the same "4 KPIs" band was a
 * different height and weight on every page. The figure is the point, so it is
 * the largest thing in the tile and always `tabular-nums` — otherwise the
 * numbers jitter sideways as they change.
 */
export function StatGrid({
  children,
  className,
}: {
  children: ReactNode;
  /** Overrides the column classes for a row with an unusual tile count. */
  className?: string;
}) {
  return (
    <div
      className={
        className ?? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      }
    >
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  /** Small line under the figure — context, not a second metric. */
  hint?: ReactNode;
  icon?: ReactNode;
  /** Colours the icon and figure. Use sparingly: a tile that is always red reads as decoration. */
  tone?: StatTone;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12px] font-medium text-muted">{label}</span>
        {icon && (
          <span className={`shrink-0 ${STAT_TONE[tone]}`} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div
        className={`mt-2 text-[24px] font-semibold leading-none tabular-nums ${
          tone === "neutral" ? "text-ink" : STAT_TONE[tone]
        }`}
      >
        {value}
      </div>
      {hint && <p className="mt-1.5 text-[11.5px] text-faint">{hint}</p>}
    </div>
  );
}
