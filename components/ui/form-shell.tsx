"use client";

import Link from "next/link";
import { ArrowLeft, Plus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Shared control styles so every form field on a screen matches. */
export const inputClass =
  "h-10 w-full rounded-[10px] border border-border bg-bg-surface-alt px-3 text-sm text-text-primary transition-colors focus:border-wujha-primary focus:bg-bg-surface focus:outline-none focus:ring-[3px] focus:ring-wujha-primary/20 disabled:opacity-60";

export const textareaClass =
  "w-full rounded-[10px] border border-border bg-bg-surface-alt px-3 py-2 text-sm text-text-primary transition-colors focus:border-wujha-primary focus:bg-bg-surface focus:outline-none focus:ring-[3px] focus:ring-wujha-primary/20 disabled:opacity-60";

/**
 * The page header card.
 *
 * The navbar carries the tenant, not the page, so this is the only thing on
 * screen naming where you are — hence a card rather than a bare line of text.
 * The icon tile is the point of it: a colour-and-shape cue is recognised faster
 * than a word is read, which matters when you move between forty screens.
 *
 * Deliberately a plain surface, not Finance's orange gradient wash. Brand
 * orange is reserved for the primary action and the active nav item; spending
 * it on every header as well would stop it meaning anything.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  backHref,
  actions,
  meta,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  actions?: ReactNode;
  /** Optional strip below the title row, e.g. counts or status pills. */
  meta?: ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-border bg-bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              aria-label="Back"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-border text-text-secondary transition-colors hover:bg-bg-surface-alt hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          {Icon && (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-wujha-primary to-wujha-primary-hover shadow-sm shadow-wujha-primary/25">
              <Icon className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold tracking-tight text-text-primary">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-[13px] text-text-secondary">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {meta && (
        <div className="mt-4 border-t border-border pt-4 text-[13px] text-text-secondary">
          {meta}
        </div>
      )}
    </section>
  );
}

/** Primary "New …" call to action used in list headers. */
export function NewButton({
  href,
  label,
  onClick,
  disabled,
}: {
  href?: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className =
    "inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-wujha-primary px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-wujha-primary-hover disabled:cursor-not-allowed disabled:opacity-50";

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

/** A grouped section card with an uppercase heading. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[14px] border border-border bg-bg-surface p-6 shadow-card ${className ?? ""}`}
    >
      {title && (
        <div className="mb-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary/80">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-[13px] text-text-secondary">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** A single labelled field. `full` spans both columns of a 2-col grid. */
export function Field({
  label,
  required,
  htmlFor,
  hint,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  hint?: ReactNode;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-text-primary"
      >
        {label}
        {required && <span className="ml-0.5 text-wujha-danger">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11.5px] text-text-secondary">{hint}</p>}
    </div>
  );
}

/** Sticky footer for form actions (Cancel / Save). */
export function FormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-border bg-bg-light/85 py-4 backdrop-blur">
      {children}
    </div>
  );
}

/** The bordered card that wraps a list table. */
export function ListCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-bg-surface shadow-card">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

/** Column headings for a list table. */
export function ListHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="bg-bg-surface-alt">
        {columns.map((heading) => (
          <th
            key={heading}
            className="whitespace-nowrap border-b border-border px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary/80"
          >
            {heading}
          </th>
        ))}
        <th className="w-0 border-b border-border px-4 py-3">
          <span className="sr-only">Actions</span>
        </th>
      </tr>
    </thead>
  );
}
