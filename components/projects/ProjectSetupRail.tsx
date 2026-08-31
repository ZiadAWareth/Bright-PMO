"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Lock } from "lucide-react";

export type SetupStepStatus = "completed" | "current" | "pending";

export interface SetupStep {
    id: string;
    title: string;
    /** Short label under the rail node — the full title is too wide at 7 nodes. */
    shortLabel: string;
    description: string;
    /** What the step produces, shown when reviewing it after completion. */
    summary: string;
    /** What has to happen before this step opens, shown while it is locked. */
    unlocks: string;
    action: string;
    icon: LucideIcon;
    route: string;
    estimatedTime: string;
    status: SetupStepStatus;
}

/**
 * The horizontal progress rail for the project setup workflow.
 *
 * The previous screen stacked seven near-identical rows joined by a 16px
 * connector stub that never reached the next row, so the sequence never read as
 * a pipeline: there was no way to tell how far along a project was without
 * counting badges. A rail states that position in one glance, the way the CRM
 * opportunity stage panel does.
 *
 * Completed and current nodes are buttons that select a step to review. Future
 * nodes are disabled rather than hidden — knowing that "Baseline" is waiting on
 * three earlier steps is information the old screen withheld entirely.
 */
export function ProjectSetupRail({
    steps,
    selectedId,
    onSelect,
}: {
    steps: SetupStep[];
    selectedId: string;
    onSelect: (id: string) => void;
}) {
    const currentIdx = steps.findIndex((s) => s.status === "current");
    const completedCount = steps.filter((s) => s.status === "completed").length;
    // A step is reachable when it is completed or current. `currentIdx` is -1
    // once every step is done, in which case the whole rail is reviewable.
    const lastReachable = currentIdx < 0 ? steps.length - 1 : currentIdx;

    const nodeCount = steps.length;
    // The track spans the full width but the nodes' centres sit half a column in
    // from each end, so the fill is measured centre-to-centre. It therefore
    // stops under the last completed node instead of overshooting it.
    //
    // Clamped because the final step counts as completed while its node is
    // still the last one on the rail: without the clamp an all-complete project
    // computes 7/6 and the fill runs past the end of the track.
    const fillPct =
        nodeCount < 2
            ? 0
            : Math.min(100, (completedCount / (nodeCount - 1)) * 100);

    return (
        <div className="rounded-[14px] border border-line bg-surface p-5 shadow-card">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                        Setup progress
                    </h2>
                    <p className="mt-1 text-[13.5px] text-ink">
                        <span className="font-semibold">{completedCount}</span>{" "}
                        of {nodeCount} steps complete
                    </p>
                </div>
                <div className="min-w-[140px] flex-1 sm:max-w-[220px]">
                    <div
                        className="h-1.5 overflow-hidden rounded-full bg-surface-3"
                        role="progressbar"
                        aria-valuenow={completedCount}
                        aria-valuemin={0}
                        aria-valuemax={nodeCount}
                        aria-label="Project setup completion"
                    >
                        <div
                            className="h-full rounded-full bg-bright transition-[width] duration-500"
                            style={{
                                width: `${(completedCount / nodeCount) * 100}%`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/*
             * Seven nodes plus their labels need roughly 640px. Below that the
             * rail scrolls inside its own container rather than wrapping, which
             * would break the track into disconnected segments.
             */}
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <div
                    className="relative flex min-w-[640px] items-start"
                    role="tablist"
                    aria-label="Setup steps"
                >
                    {/* The track sits behind the nodes, aligned to their centres. */}
                    <div className="absolute inset-x-0 top-[17px] z-[1] h-0.5 bg-line" />
                    <div
                        className="absolute left-0 top-[17px] z-[1] h-0.5 bg-success transition-[width] duration-500"
                        style={{ width: `${fillPct}%` }}
                    />

                    {steps.map((step, i) => {
                        const Icon = step.icon;
                        const done = step.status === "completed";
                        const current = step.status === "current";
                        const reachable = i <= lastReachable;
                        const reviewing = step.id === selectedId;

                        return (
                            <button
                                key={step.id}
                                type="button"
                                role="tab"
                                aria-selected={reviewing}
                                disabled={!reachable}
                                onClick={() => onSelect(step.id)}
                                title={
                                    reachable
                                        ? `Review ${step.title}`
                                        : `${step.title} — unlocks once earlier steps are complete`
                                }
                                className={`group relative z-[2] flex flex-1 flex-col items-center gap-2 px-1 focus-visible:outline-none ${
                                    reachable
                                        ? "cursor-pointer"
                                        : "cursor-not-allowed"
                                }`}
                            >
                                <span
                                    className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border-2 transition-all group-focus-visible:ring-[3px] group-focus-visible:ring-bright-soft ${
                                        done
                                            ? "border-success bg-success text-white"
                                            : current
                                              ? "border-bright bg-bright text-white"
                                              : "border-line bg-surface text-faint"
                                    } ${reviewing ? "ring-[3px] ring-bright-soft" : ""}`}
                                >
                                    {done ? (
                                        <Check
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                    ) : reachable ? (
                                        <Icon
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Lock
                                            className="h-3 w-3"
                                            aria-hidden="true"
                                        />
                                    )}
                                </span>
                                <span
                                    className={`max-w-[88px] text-center text-[11.5px] font-semibold leading-tight ${
                                        reviewing || current
                                            ? "text-ink"
                                            : "text-muted"
                                    }`}
                                >
                                    {step.shortLabel}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
