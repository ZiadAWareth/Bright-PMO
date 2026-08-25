"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { inputClass } from "@/components/ui/form-shell";

export interface DeletableEps {
  eps_id: number;
  name: string;
}

/**
 * Confirmation for deleting an EPS node.
 *
 * Deleting a node with descendants is destructive beyond what the user can see
 * on screen, so the dialog states the full descendant count, requires the name
 * to be typed back, and keeps cascade behind an explicit opt-in.
 */
export function DeleteEpsDialog({
  isOpen,
  onClose,
  onConfirm,
  epsName,
  isDeleting,
  childCount,
  totalDescendantCount,
  useCascadeDelete,
  onCascadeDeleteChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  epsName: string;
  isDeleting: boolean;
  childCount: number;
  totalDescendantCount: number;
  useCascadeDelete: boolean;
  onCascadeDeleteChange: (value: boolean) => void;
}) {
  const [confirmText, setConfirmText] = useState("");

  // Clear the typed confirmation whenever a different node is targeted.
  useEffect(() => {
    if (isOpen) setConfirmText("");
  }, [isOpen, epsName]);

  if (!isOpen) return null;

  const hasChildren = childCount > 0;
  const descendants = totalDescendantCount || childCount;
  const nameMatches = confirmText === epsName;
  const canDelete = nameMatches && (!hasChildren || useCascadeDelete) && !isDeleting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-eps-title"
    >
      <div className="w-full max-w-md rounded-[14px] border border-border bg-bg-surface p-6 shadow-card-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-wujha-danger/10 text-wujha-danger">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2
              id="delete-eps-title"
              className="text-[17px] font-semibold text-text-primary"
            >
              Delete EPS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-bg-surface-alt hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-[13.5px] text-text-secondary">
          This permanently removes{" "}
          <span className="font-semibold text-text-primary">{epsName}</span>.
        </p>

        {hasChildren && (
          <div className="mt-4 rounded-[12px] border border-amber-500/30 bg-amber-500/10 p-3.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-text-primary">
                  {descendants} descendant{descendants === 1 ? "" : "s"} will be
                  deleted too
                </p>
                <p className="mt-0.5 text-[12.5px] text-text-secondary">
                  Every node beneath this one is removed with it. This cannot be
                  undone.
                </p>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-text-primary">
                  <input
                    type="checkbox"
                    checked={useCascadeDelete}
                    onChange={(e) => onCascadeDeleteChange(e.target.checked)}
                    disabled={isDeleting}
                    className="h-4 w-4 rounded border-border accent-wujha-danger"
                  />
                  Yes, delete this node and all {descendants} descendant
                  {descendants === 1 ? "" : "s"}
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <label
            htmlFor="delete-eps-confirm"
            className="mb-1.5 block text-[13px] font-medium text-text-primary"
          >
            Type <span className="font-semibold">{epsName}</span> to confirm
          </label>
          <input
            id="delete-eps-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isDeleting}
            autoComplete="off"
            className={inputClass}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-10 items-center rounded-[10px] border border-border px-4 text-[13.5px] font-medium text-text-secondary transition-colors hover:bg-bg-surface-alt hover:text-text-primary disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-wujha-danger px-4 text-[13.5px] font-semibold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Deleting…
              </>
            ) : (
              "Delete EPS"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
