"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

/** Shared control styles so every form field on a screen matches. */
export const inputClass =
  "h-10 w-full rounded-[10px] border border-line bg-surface-2 px-3 text-sm text-ink transition-colors focus:border-bright focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-bright-soft disabled:opacity-60";

export const textareaClass =
  "w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-sm text-ink transition-colors focus:border-bright focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-bright-soft disabled:opacity-60";

/**
 * The page header: title, optional subtitle, and the screen's actions.
 *
 * Deliberately flat — no border, background, shadow or icon tile. It used to be
 * a card, and the card was the problem: the navbar directly above it is also a
 * bordered, shadowed, full-width bar, so two of them stacked read as two rows
 * of chrome rather than as the start of the page. On the denser screens that
 * cost roughly 250px before any content appeared.
 *
 * The icon tile went with it. A gradient orange tile is one of the loudest
 * things on screen, and it was spending that weight to repeat what the sidebar
 * already shows by highlighting the active nav item — while breaking the rule
 * that brand orange belongs to primary actions and active navigation.
 *
 * This matches the Bright CRM console, where the title is a bare heading on the
 * page background on both list and detail screens. Keeping the two products
 * aligned matters more than either treatment on its own.
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  meta,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Renders a back link above the title, for detail and create screens. */
  backHref?: string;
  /** Text for the back link; falls back to a generic "Back". */
  backLabel?: string;
  actions?: ReactNode;
  /** Optional strip below the title row, e.g. counts or status pills. */
  meta?: ReactNode;
  /**
   * Accepted but no longer rendered. Call sites and `DashboardLayout` still
   * pass an icon; keeping the prop means the tile could be removed in one place
   * instead of editing forty screens, and leaves the door open if it comes back.
   */
  icon?: LucideIcon;
}) {
  return (
    <section>
      {backHref && (
        <Link
          href={backHref}
          className="text-[13px] text-muted transition-colors hover:text-ink"
        >
          &larr; {backLabel ?? "Back"}
        </Link>
      )}

      <div
        className={`flex flex-wrap items-end justify-between gap-4${
          backHref ? " mt-3" : ""
        }`}
      >
        <div className="min-w-0">
          <h1 className="truncate text-[25px] font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[13.5px] text-muted">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {meta && (
        <div className="mt-4 border-t border-line pt-4 text-[13px] text-muted">
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
    "inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-bright px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-bright-deep disabled:cursor-not-allowed disabled:opacity-50";

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
      className={`rounded-[14px] border border-line bg-surface p-6 shadow-card ${className ?? ""}`}
    >
      {title && (
        <div className="mb-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-[13px] text-muted">{description}</p>
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
        className="block text-[13px] font-medium text-ink"
      >
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11.5px] text-muted">{hint}</p>}
    </div>
  );
}

/**
 * The row of form actions (Cancel / Save) that closes a form.
 *
 * Deliberately not sticky: a pinned bar leaves page content half-visible
 * underneath it, which reads as a rendering fault. As the last block on the
 * page it is unambiguous — you scroll to the end and the actions are there.
 */
export function FormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 flex items-center justify-end gap-3 border-t border-line pt-5">
      {children}
    </div>
  );
}

/**
 * A subsection heading inside a FormSection.
 *
 * Long forms need a level between the section card and an individual field —
 * "Account" and "Contact" inside one "Account & Contact" card. Small and
 * uppercase in brand ink so it groups fields without competing with the
 * section title above it.
 */
export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-bright-deep">
      {children}
    </div>
  );
}

/**
 * The standard field grid inside a FormSection.
 *
 * Every create/edit screen lays its fields out the same way, so the class
 * string lives here rather than being retyped (and drifting) on each screen.
 * Pair with `Field full` for controls that should span both columns.
 */
export function FieldGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-5 sm:grid-cols-2 ${className ?? ""}`}>
      {children}
    </div>
  );
}

/**
 * Validation / submission failure banner for a form.
 *
 * `role="alert"` so the message is announced rather than only seen; screens
 * previously set errors into a silent div, which a keyboard user filling the
 * form never noticed.
 */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3 text-[13.5px] text-danger"
    >
      {children}
    </div>
  );
}

/**
 * The two buttons that close a form: a quiet Cancel and the primary submit.
 *
 * These are the only place brand orange is spent on a create/edit screen, so
 * they are defined once here. `SubmitButton` owns its own busy state, which
 * keeps the disabled/spinner/label logic from being re-derived per screen.
 */
export function CancelButton({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const className =
    "inline-flex h-10 items-center rounded-[10px] border border-line px-4 text-[13.5px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink";
  if (href) {
    return (
      <Link href={href} className={className}>
        {children ?? "Cancel"}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children ?? "Cancel"}
    </button>
  );
}

export function SubmitButton({
  busy,
  busyLabel,
  icon,
  children,
  disabled,
  onClick,
}: {
  busy?: boolean;
  busyLabel?: string;
  icon?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  /**
   * For wizards, which submit from a click handler rather than a form submit.
   * Supplying it also switches the button out of type="submit", so it cannot
   * additionally submit an enclosing form.
   */
  onClick?: () => void;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={busy || disabled}
      className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-bright px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-bright-deep disabled:opacity-60"
    >
      {busy ? (
        <>
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
          {busyLabel ?? "Saving…"}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

/**
 * The step rail for a multi-step create form.
 *
 * Both wizards (new resource, new project) drew their own copy of this, which
 * is why they had drifted apart. One implementation means the completed /
 * current / upcoming states, the connector rule and the keyboard behaviour are
 * decided once.
 *
 * Steps are real `button`s rather than clickable divs, so the rail is
 * reachable by keyboard, and `aria-current="step"` names the active one. Only
 * steps already visited are navigable — jumping ahead skips the validation the
 * wizard runs on Next.
 */
export function FormSteps({
  steps,
  current,
  onStepChange,
}: {
  steps: {
    id: string;
    label: string;
    icon?: ReactNode;
    /** Marks a visited step that failed validation. */
    error?: boolean;
    /** Small line under the label, e.g. "2 errors". */
    hint?: ReactNode;
  }[];
  current: number;
  onStepChange?: (index: number) => void;
}) {
  return (
    <nav aria-label="Progress">
      <ol className="flex w-full items-center">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const failed = Boolean(step.error);
          const reachable = index <= current && Boolean(onStepChange);

          return (
            <li
              key={step.id}
              className={`flex min-w-0 items-center ${
                index < steps.length - 1 ? "flex-1" : "shrink-0"
              }`}
            >
              <button
                type="button"
                onClick={reachable ? () => onStepChange?.(index) : undefined}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                className={`flex min-w-0 shrink-0 items-center gap-2.5 rounded-[10px] px-2 py-1.5 transition-colors ${
                  reachable ? "hover:bg-surface-2" : "cursor-default"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[13px] font-semibold transition-colors ${
                    failed
                      ? "border-danger bg-danger-soft text-danger"
                      : done
                        ? "border-success bg-success-soft text-success"
                        : active
                          ? "border-bright bg-bright text-white"
                          : "border-line bg-surface-2 text-muted"
                  }`}
                >
                  {failed ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : done ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    (step.icon ?? index + 1)
                  )}
                </span>
                <span className="hidden min-w-0 text-left md:block">
                  <span
                    className={`block truncate text-[13px] ${
                      active
                        ? "font-semibold text-ink"
                        : done
                          ? "font-medium text-ink"
                          : "text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.hint && (
                    <span
                      className={`block text-[11.5px] ${
                        failed ? "text-danger" : "text-muted"
                      }`}
                    >
                      {step.hint}
                    </span>
                  )}
                </span>
              </button>

              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`mx-2 h-px min-w-4 flex-1 ${
                    done ? "bg-success" : "bg-line"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The Previous / Next pair a wizard closes with. Mirrors FormFooter — a static
 * last block, not a pinned bar — but the left slot is a real back step rather
 * than a cancel link.
 */
export function WizardFooter({
  onPrevious,
  previousDisabled,
  children,
}: {
  onPrevious?: () => void;
  previousDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-5">
      <button
        type="button"
        onClick={onPrevious}
        disabled={previousDisabled}
        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-line px-4 text-[13.5px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </button>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

/**
 * The primary "advance a step" button. Same weight as SubmitButton so the
 * wizard's call to action does not change size between steps.
 */
export function NextButton({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-bright px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-bright-deep disabled:opacity-60"
    >
      {children ?? "Next"}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/** The bordered card that wraps a list table. */
export function ListCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-card">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

/** Column headings for a list table. */
export function ListHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="bg-surface-2">
        {columns.map((heading) => (
          <th
            key={heading}
            className="whitespace-nowrap border-b border-line px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint"
          >
            {heading}
          </th>
        ))}
        <th className="w-0 border-b border-line px-4 py-3">
          <span className="sr-only">Actions</span>
        </th>
      </tr>
    </thead>
  );
}

/** Read-only two-column definition list for detail screens. Pair with FormSection. */
export function InfoGrid({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map(([key, value]) => (
        <div
          key={key}
          className="flex items-center justify-between gap-4 border-b border-line-2 pb-3"
        >
          <dt className="text-[13px] text-muted">{key}</dt>
          <dd className="text-right text-[13.5px] font-medium text-ink">
            {value ?? <span className="text-faint">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The tones a status pill can take. Keyed by meaning, not by colour. */
export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  brand: "bg-bright-soft text-bright-deep",
};

/**
 * A status pill.
 *
 * Every list screen was previously carrying its own `Record<string, string>` of
 * Tailwind classes per status. Those maps drifted — the same status rendered
 * green on one page and grey on another. Callers now map their domain status to
 * a `tone` and the colours live in one place.
 */
export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: {
  label: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  if (label === null || label === undefined || label === "") {
    return <span className="text-[13px] text-faint">—</span>;
  }
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold capitalize ${BADGE_TONE[tone]} ${className ?? ""}`}
    >
      {label}
    </span>
  );
}

/** Row of icon actions pinned to the right of a table row. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-0.5">{children}</div>;
}

/** A single icon button for use inside RowActions. */
export function RowAction({
  icon: Icon,
  label,
  onClick,
  href,
  tone = "default",
}: {
  icon: LucideIcon;
  /** Used as both the tooltip and the accessible name. */
  label: string;
  onClick?: () => void;
  href?: string;
  tone?: "default" | "danger";
}) {
  const className = `grid h-8 w-8 place-items-center rounded-[8px] transition-colors ${
    tone === "danger"
      ? "text-muted hover:bg-danger-soft hover:text-danger"
      : "text-muted hover:bg-bright-soft hover:text-bright-deep"
  }`;

  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={className}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

/**
 * The empty / loading / error row inside a list table.
 *
 * `colSpan` must cover every column including the actions column, otherwise the
 * message sits under the first column instead of centred across the table.
 */
export function ListMessage({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}

/** A list table row with the standard hover and divider treatment. */
export function ListRow({
  children,
  onClick,
  selected = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  /**
   * Bulk-selection state. Marked with a left brand rule rather than a filled
   * background: a wash competes with the status pills in the row and makes the
   * text harder to read, whereas the rule is unmistakable and costs no contrast.
   */
  selected?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      data-selected={selected || undefined}
      className={`border-b border-line-2 transition-colors last:border-0 hover:bg-surface-2 ${
        onClick ? "cursor-pointer" : ""
      } ${
        selected
          ? "bg-bright-soft/40 shadow-[inset_3px_0_0_0_var(--bright)]"
          : ""
      }`}
    >
      {children}
    </tr>
  );
}
