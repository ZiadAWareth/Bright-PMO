"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { Modal } from "./modal";
import { Spinner } from "./spinner";

export type ConfirmTone = "danger" | "warning" | "info";

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
}

type Resolver = (confirmed: boolean) => void;

const ConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

const TONE: Record<
  ConfirmTone,
  { icon: typeof AlertTriangle; iconClass: string; wellClass: string; button: string }
> = {
  danger: {
    icon: Trash2,
    iconClass: "text-danger",
    wellClass: "bg-danger-soft",
    button: "bg-danger text-white hover:opacity-90",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-warning",
    wellClass: "bg-warning-soft",
    button: "bg-warning text-ink hover:opacity-90",
  },
  info: {
    icon: Info,
    iconClass: "text-info",
    wellClass: "bg-info-soft",
    button: "bg-bright text-white hover:bg-bright-deep",
  },
};

/**
 * Provides an awaitable `confirm()` so a destructive action reads as a single
 * straight line:
 *
 *     if (!(await confirm({ title: "Delete task?", tone: "danger" }))) return;
 *     await deleteTask(id);
 *
 * The alternative — which the app currently does in ~56 places — is a pair of
 * `useState`s per screen plus a bespoke modal, with the pending item threaded
 * through component state. This keeps the decision at the call site where the
 * action is, and there is exactly one dialog in the tree.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<Resolver | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    setBusy(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (confirmed: boolean) => {
    // Resolve before clearing so a caller that immediately re-opens a dialog
    // is not racing this component's own unmount.
    resolver.current?.(confirmed);
    resolver.current = null;
    setOptions(null);
    setBusy(false);
  };

  const tone = TONE[options?.tone ?? "danger"];
  const Icon = tone.icon;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <Modal
        open={options !== null}
        onClose={() => settle(false)}
        title={options?.title ?? ""}
        maxWidthClass="max-w-md"
        closeOnBackdrop={false}
        footer={
          <>
            <button
              type="button"
              onClick={() => settle(false)}
              className="h-[38px] rounded-[10px] border border-line bg-surface px-4 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              {options?.cancelText ?? "Cancel"}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setBusy(true);
                settle(true);
              }}
              disabled={busy}
              className={`inline-flex h-[38px] items-center gap-2 rounded-[10px] px-4 text-[13.5px] font-semibold transition-colors disabled:opacity-60 ${tone.button}`}
            >
              {busy && <Spinner size={16} />}
              {options?.confirmText ?? "Confirm"}
            </button>
          </>
        }
      >
        <div className="flex gap-4">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone.wellClass}`}
          >
            <Icon className={`h-5 w-5 ${tone.iconClass}`} aria-hidden="true" />
          </span>
          <div className="min-w-0 pt-1 text-[13.5px] leading-relaxed text-muted">
            {options?.message ?? "This action cannot be undone."}
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

/**
 * Returns the awaitable confirm function.
 *
 * Throws if used outside `ConfirmProvider` rather than silently returning
 * `true` — a destructive action that proceeds because its guard quietly
 * no-opped is the worst possible failure here.
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return ctx;
}
