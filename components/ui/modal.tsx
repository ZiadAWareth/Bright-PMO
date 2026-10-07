"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { testId } from "@/components/ui/form-shell";

/** Elements that can hold focus inside a dialog. */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Keep Tab inside the dialog while it is open, and give focus back afterwards.
 *
 * A dialog that does not trap focus lets Tab walk into the page behind it: the
 * caller can drive controls they cannot see, and a screen-reader user is read
 * the background instead of the dialog. Wrapping at both ends makes the dialog
 * the whole tab loop, which is what `aria-modal` already promises assistive
 * technology is true.
 *
 * The element that opened the dialog is restored on close, so dismissing one
 * returns the caret to the button that launched it rather than the top of the
 * document.
 */
function useFocusTrap(
  open: boolean,
  panelRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const opener = document.activeElement as HTMLElement | null;

    // Focus the first control, falling back to the panel so focus never
    // stays behind on the page for a dialog that holds no focusable child.
    const initial = panel.querySelector<HTMLElement>(FOCUSABLE);
    (initial ?? panel).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    return () => {
      panel.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, [open, panelRef]);
}

/**
 * Centred modal dialog with an overlay, Esc-to-close and backdrop-to-close.
 *
 * Rendered through a portal onto `document.body` so it escapes any ancestor
 * with `overflow: hidden` or its own stacking context — the reason the
 * hand-rolled `fixed inset-0` overlays scattered through the app clip
 * unpredictably when opened from inside a scrolling panel.
 *
 * Backdrop dismissal fires on mouse*down*-then-*up* both landing on the
 * backdrop. Without that pairing, selecting text inside the dialog and
 * releasing the mouse outside it reads as a backdrop click and throws away
 * what the user just typed.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClass = "max-w-md",
  closeOnBackdrop = true,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * The dialog heading. A node is allowed so a title may interpolate a value;
   * the accessible name then comes from the rendered heading via
   * `aria-labelledby` rather than from an `aria-label` string.
   */
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Pinned below the scrolling body, for Cancel/Save actions. */
  footer?: ReactNode;
  /** Tailwind max-width for the dialog, e.g. `max-w-3xl` for a wide form. */
  maxWidthClass?: string;
  /** Set false for destructive flows that must be dismissed deliberately. */
  closeOnBackdrop?: boolean;
  /** Decorative glyph shown left of the title. */
  icon?: ReactNode;
}) {
  const backdropArmed = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(open, panelRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Stop the page behind the dialog scrolling while it is open.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid={
        typeof title === "string" ? `modal-${testId(title)}` : "modal"
      }
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onMouseDown={() => {
          backdropArmed.current = true;
        }}
        onMouseUp={() => {
          if (backdropArmed.current && closeOnBackdrop) onClose();
          backdropArmed.current = false;
        }}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[90vh] w-full ${maxWidthClass} flex-col overflow-hidden rounded-[16px] border border-line bg-surface shadow-card-lg`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span aria-hidden="true" className="shrink-0 text-muted">
                {icon}
              </span>
            )}
            <div className="min-w-0">
            <h2
              id={titleId}
              className="font-display text-[18px] font-semibold tracking-tight text-ink"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[13px] text-muted">{description}</p>
            )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-line p-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
