"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/form-shell";
import { Spinner } from "@/components/ui/spinner";
import { humanize } from "@/lib/status-tone";

export interface ProjectInfo {
  project_id: number;
  name: string;
  status: string;
}

const ACTIVE_STATUSES = [
  "planning",
  "execution",
  "pending_approval",
  "approved",
  "on_hold",
];

const ghostButton =
  "inline-flex h-[38px] items-center rounded-[10px] border border-line bg-surface px-4 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50";
const dangerButton =
  "inline-flex h-[38px] items-center gap-2 rounded-[10px] bg-danger px-4 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

/** A scrollable, bulleted list of the projects a portfolio holds. */
function ProjectList({
  title,
  projects,
  limit,
}: {
  title: string;
  projects: ProjectInfo[];
  limit?: number;
}) {
  const shown = limit ? projects.slice(0, limit) : projects;
  const hidden = projects.length - shown.length;

  return (
    <div className="rounded-[10px] bg-surface-2 p-3">
      <p className="mb-2 text-[12px] font-semibold text-ink">
        {title} ({projects.length})
      </p>
      <ul className="max-h-32 space-y-1.5 overflow-y-auto">
        {shown.map((project) => (
          <li
            key={project.project_id}
            className="flex items-center justify-between gap-2 text-[12.5px] text-ink-2"
          >
            <span className="truncate">
              {project.name || `Project #${project.project_id}`}
            </span>
            <StatusBadge label={humanize(project.status)} />
          </li>
        ))}
        {hidden > 0 && (
          <li className="text-[12px] italic text-muted">
            …and {hidden} more
          </li>
        )}
      </ul>
    </div>
  );
}

/**
 * Portfolio deletion, which is not a plain confirm.
 *
 * A portfolio holding active projects cannot be deleted at all — the dialog
 * turns into an explanation of what is blocking it, listing the projects by
 * name so the user knows where to go next. Only an admin gets past that, and
 * only by typing DELETE, because forcing it destroys every project in the
 * portfolio along with it.
 *
 * The typed confirmation is held in React state rather than read out of the DOM
 * by id on click, so the Force delete button can stay disabled until the word
 * matches instead of failing with a toast after the fact.
 */
export function DeletePortfolioDialog({
  isOpen,
  onClose,
  onConfirm,
  onForceDelete,
  portfolioName,
  isDeleting,
  projects,
  hasActiveProjects,
  canForceDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onForceDelete: () => void;
  portfolioName: string;
  isDeleting: boolean;
  projects: ProjectInfo[];
  hasActiveProjects: boolean;
  canForceDelete: boolean;
}) {
  const [forcing, setForcing] = useState(false);
  const [typed, setTyped] = useState("");

  // Reopening must not inherit a half-finished force-delete from last time.
  useEffect(() => {
    if (!isOpen) {
      setForcing(false);
      setTyped("");
    }
  }, [isOpen]);

  const activeProjects = projects.filter((p) =>
    ACTIVE_STATUSES.includes(p.status),
  );
  const completedProjects = projects.filter((p) =>
    ["completed", "closed"].includes(p.status),
  );

  if (forcing) {
    return (
      <Modal
        open={isOpen}
        onClose={() => setForcing(false)}
        title="Force delete portfolio"
        description="This cannot be undone."
        closeOnBackdrop={false}
        footer={
          <>
            <button
              type="button"
              onClick={() => setForcing(false)}
              className={ghostButton}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={typed !== "DELETE" || isDeleting}
              onClick={() => {
                setForcing(false);
                onForceDelete();
              }}
              className={dangerButton}
            >
              {isDeleting && <Spinner size={14} className="text-white" />}
              Force delete
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-[10px] bg-danger-soft p-4">
            <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-danger">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              This will permanently delete:
            </p>
            <ul className="space-y-1 text-[12.5px] text-danger">
              <li>• The portfolio “{portfolioName}”</li>
              <li>
                • {activeProjects.length} active project
                {activeProjects.length === 1 ? "" : "s"} and all their data
              </li>
              <li>• All tasks, budgets, documents and related records</li>
            </ul>
          </div>

          <div>
            <label
              htmlFor="force-delete-confirm"
              className="mb-1.5 block text-[13px] text-ink"
            >
              Type <strong className="text-danger">DELETE</strong> to confirm
            </label>
            <input
              id="force-delete-confirm"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="DELETE"
              autoFocus
              autoComplete="off"
              className="h-10 w-full rounded-[10px] border border-line bg-surface-2 px-3 text-sm text-ink transition-colors focus:border-danger focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-danger-soft"
            />
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        hasActiveProjects ? "Cannot delete portfolio" : "Delete portfolio?"
      }
      closeOnBackdrop={!isDeleting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className={ghostButton}
          >
            {hasActiveProjects ? "Close" : "Cancel"}
          </button>
          {hasActiveProjects
            ? canForceDelete && (
                <button
                  type="button"
                  onClick={() => setForcing(true)}
                  disabled={isDeleting}
                  className={dangerButton}
                >
                  Force delete
                </button>
              )
            : (
              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                className={dangerButton}
              >
                {isDeleting && <Spinner size={14} className="text-white" />}
                Delete portfolio
              </button>
            )}
        </>
      }
    >
      {hasActiveProjects ? (
        <div className="space-y-4">
          <div className="rounded-[10px] bg-danger-soft p-4">
            <p className="mb-1 text-[13px] font-semibold text-danger">
              This portfolio contains active projects.
            </p>
            <p className="text-[12.5px] text-danger">
              Complete or close them before deleting the portfolio.
            </p>
          </div>
          <p className="text-[13px] text-ink-2">
            <span className="font-semibold text-ink">{portfolioName}</span>{" "}
            contains:
          </p>
          <div className="space-y-2">
            <ProjectList title="Active projects" projects={activeProjects} />
            {completedProjects.length > 0 && (
              <ProjectList
                title="Completed / closed projects"
                projects={completedProjects}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[13.5px] text-ink-2">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-ink">{portfolioName}</span>? This
            cannot be undone.
          </p>
          {projects.length > 0 && (
            <div className="rounded-[10px] bg-warning-soft p-4">
              <p className="mb-2 text-[13px] font-semibold text-warning">
                This will also delete {projects.length} project
                {projects.length === 1 ? "" : "s"}:
              </p>
              <ProjectList title="Projects" projects={projects} limit={10} />
            </div>
          )}
          <p className="text-[12.5px] text-muted">
            All associated data — projects, tasks, budgets and documents — will
            be permanently removed.
          </p>
        </div>
      )}
    </Modal>
  );
}

export default DeletePortfolioDialog;
