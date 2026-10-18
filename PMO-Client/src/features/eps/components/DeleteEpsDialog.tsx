"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { inputClass } from "@/components/ui/form-shell";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";

export interface DeletableEps {
  eps_id: number;
  name: string;
}

/**
 * Confirmation for deleting an EPS node.
 *
 * Deleting a node with descendants is destructive beyond what the user can see
 * on screen, so the dialog states the full descendant count, requires the name
 * to be typed back, and keeps cascade behind an explicit opt-in. That extra
 * friction is why this is its own dialog rather than a `useConfirm` call.
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

  const hasChildren = childCount > 0;
  const descendants = totalDescendantCount || childCount;
  const nameMatches = confirmText === epsName;
  const canDelete = nameMatches && (!hasChildren || useCascadeDelete) && !isDeleting;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Delete EPS"
      // A half-typed confirmation should not be thrown away by a stray click.
      closeOnBackdrop={false}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-10 items-center rounded-[10px] border border-line px-4 text-[13.5px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-danger px-4 text-[13.5px] font-semibold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Spinner size={16} />
                Deleting…
              </>
            ) : (
              "Delete EPS"
            )}
          </button>
        </>
      }
    >
      <p className="text-[13.5px] text-muted">
        This permanently removes{" "}
        <span className="font-semibold text-ink">{epsName}</span>.
      </p>

      {hasChildren && (
        <div className="mt-4 rounded-[12px] border border-warning/30 bg-warning-soft p-3.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-warning"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink">
                {descendants} descendant{descendants === 1 ? "" : "s"} will be
                deleted too
              </p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                Every node beneath this one is removed with it. This cannot be
                undone.
              </p>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                <input
                  type="checkbox"
                  checked={useCascadeDelete}
                  onChange={(e) => onCascadeDeleteChange(e.target.checked)}
                  disabled={isDeleting}
                  className="h-4 w-4 rounded border-line accent-danger"
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
          className="mb-1.5 block text-[13px] font-medium text-ink"
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
    </Modal>
  );
}
