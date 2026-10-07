"use client";

import React from "react";
import Link from "next/link";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
    FileText,
    CheckCircle,
    AlertTriangle,
    Clock,
    ArrowRight,
} from "lucide-react";
import { ProjectWithRelations } from "@/types/project";
import {
    EmptyState,
    StatCard,
    StatusBadge,
    actionPrimary,
    actionSecondary,
    type BadgeTone,
} from "@/components/ui/form-shell";

interface ClosureSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    /** Retained so the call site in the project page keeps compiling. */
    router?: AppRouterInstance;
}

/** Project status to the pill shown when closure is unavailable. */
const STATUS_TONE: Record<string, { label: string; tone: BadgeTone }> = {
    execution: { label: "In Execution", tone: "info" },
    planning: { label: "In Planning", tone: "warning" },
    on_hold: { label: "On Hold", tone: "warning" },
    cancelled: { label: "Cancelled", tone: "danger" },
};

export default function ClosureSection({
    project,
    projectId,
}: ClosureSectionProps) {
    const href = `/projects/${projectId}/closure`;

    const docs = project.closure_documents ?? [];
    const checks = project.closure_checklists ?? [];
    const punch = project.punch_list_items ?? [];

    const docsApproved = docs.filter((d) => d.document && d.approved).length;
    const docsPending = docs.filter((d) => !d.document).length;
    const checksDone = checks.filter((c) => c.status === "complete").length;
    const checksPending = checks.filter((c) => c.status === "pending").length;
    const punchResolved = punch.filter((i) => i.status === "resolved").length;
    const punchOpen = punch.filter((i) => i.status === "open").length;

    const pct = (n: number, total: number) =>
        total ? Math.round((n / total) * 100) : 0;

    const started = checks.length > 0;
    const completed = project.status === "completed";

    return (
        <section
            aria-labelledby="closure-section-heading"
            className="rounded-xl border border-line bg-surface"
        >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
                <h2
                    id="closure-section-heading"
                    className="font-display text-[15px] font-semibold text-ink"
                >
                    Project Closure
                </h2>
                {/* One route, one control. The header previously offered
                    "Manage Closure" while the summary below offered "View
                    Details" — two buttons of different weight going to the
                    same page. */}
                <Link href={href} className={actionSecondary}>
                    Open closure
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </header>

            <div className="space-y-6 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Closure Documents"
                        value={docs.length}
                        hint={
                            docs.length
                                ? `${docsApproved} approved · ${docsPending} pending upload`
                                : "None required yet"
                        }
                        icon={FileText}
                        tone="info"
                    />
                    <StatCard
                        label="Checklist Items"
                        value={
                            <>
                                {checksDone}
                                <span className="text-[15px] font-normal text-muted">
                                    /{checks.length}
                                </span>
                            </>
                        }
                        hint={
                            checks.length
                                ? `${pct(checksDone, checks.length)}% complete · ${checksPending} pending`
                                : "Not started"
                        }
                        icon={CheckCircle}
                        tone="success"
                    />
                    <StatCard
                        label="Punch List Items"
                        value={
                            <>
                                {punchResolved}
                                <span className="text-[15px] font-normal text-muted">
                                    /{punch.length}
                                </span>
                            </>
                        }
                        hint={
                            punch.length
                                ? `${pct(punchResolved, punch.length)}% resolved · ${punchOpen} open`
                                : "None raised"
                        }
                        icon={AlertTriangle}
                        tone={punchOpen > 0 ? "warning" : "neutral"}
                    />
                </div>

                {!completed ? (
                    <EmptyState
                        icon={Clock}
                        tone="info"
                        title="Closure not yet available"
                        description="The closure workflow opens once this project is marked Completed."
                    >
                        <div className="flex items-center justify-center gap-2 border-t border-line pt-5 text-[13px] text-muted">
                            Current status
                            <StatusBadge
                                label={
                                    STATUS_TONE[project.status]?.label ??
                                    project.status.replace("_", " ")
                                }
                                tone={STATUS_TONE[project.status]?.tone ?? "neutral"}
                            />
                        </div>
                    </EmptyState>
                ) : !started ? (
                    <EmptyState
                        icon={CheckCircle}
                        title="Closure not started"
                        description="Starting closure creates the seven-step checklist covering inspection, punch list, documents, handover, approval and the final report."
                        action={
                            <Link href={href} className={actionPrimary}>
                                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                                Start closure process
                            </Link>
                        }
                    />
                ) : (
                    /* Outstanding work only.
                       This block used to restate the three figures above as a
                       second "Progress Summary" grid, so the same numbers were
                       on screen twice in different framings. It now shows the
                       progress bar and what is left, which is the part the
                       cards do not already say. */
                    <div className="rounded-xl border border-line bg-surface-2 p-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <h3 className="text-[13.5px] font-semibold text-ink">
                                Closure progress
                            </h3>
                            <p className="text-[13px] text-muted">
                                <span className="font-semibold tabular-nums text-ink">
                                    {pct(checksDone, checks.length)}%
                                </span>{" "}
                                complete
                            </p>
                        </div>

                        <div
                            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-3"
                            role="progressbar"
                            aria-valuenow={pct(checksDone, checks.length)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Closure checklist progress"
                        >
                            <div
                                className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${
                                    checksDone === checks.length
                                        ? "bg-success"
                                        : "bg-bright"
                                }`}
                                style={{
                                    width: `${pct(checksDone, checks.length)}%`,
                                }}
                            />
                        </div>

                        <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
                            {[
                                { label: "Documents pending upload", value: docsPending },
                                { label: "Checklist items pending", value: checksPending },
                                { label: "Open punch list items", value: punchOpen },
                            ].map((row) => (
                                <div key={row.label} className="bg-surface px-4 py-3">
                                    <dt className="text-[12.5px] text-muted">
                                        {row.label}
                                    </dt>
                                    <dd
                                        className={`mt-0.5 font-display text-[19px] font-semibold tabular-nums ${
                                            row.value > 0 ? "text-ink" : "text-faint"
                                        }`}
                                    >
                                        {row.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
            </div>
        </section>
    );
}
