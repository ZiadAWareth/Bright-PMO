"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Pinned below the scrolling body, for Cancel/Save actions. */
  footer?: ReactNode;
  /** Tailwind max-width for the dialog, e.g. `max-w-3xl` for a wide form. */
  maxWidthClass?: string;
  /** Set false for destructive flows that must be dismissed deliberately. */
  closeOnBackdrop?: boolean;
}) {
  const backdropArmed = useRef(false);

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
      aria-label={title}
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
        className={`relative z-10 flex max-h-[90vh] w-full ${maxWidthClass} flex-col overflow-hidden rounded-[16px] border border-line bg-surface shadow-card-lg`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-6">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[13px] text-muted">{description}</p>
            )}
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
