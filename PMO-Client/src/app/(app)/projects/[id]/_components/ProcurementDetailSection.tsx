"use client";

import React from "react";
import Link from "next/link";
import {
    Edit,
    ArrowRight,
    Plus,
    FileText,
    CheckCircle,
    Clock,
    DollarSign,
} from "lucide-react";
import {
    EmptyState,
    StatCard,
    StatusBadge,
    RowAction,
    RowActions,
    actionPrimary,
    actionSecondary,
    type BadgeTone,
} from "@/components/ui/form-shell";

interface ProcurementDetailSectionProps {
    projectId: string;
    procurements: any[];
    setProcurements?: React.Dispatch<React.SetStateAction<any[]>>;
}

/** Statuses that count as active work rather than finished or not yet started. */
const IN_PROGRESS = ["Planning", "Tendering", "Evaluation", "Awarded"];

/**
 * Procurement status to a badge tone.
 *
 * The status was previously upper-cased in the markup ("COMPLETED"), which is
 * shouting for a value the reader is only scanning. `StatusBadge` capitalises
 * it instead, so the badge matches every other status pill in the product.
 */
const STATUS_TONE: Record<string, BadgeTone> = {
    Completed: "success",
    Awarded: "info",
    Planning: "warning",
    Tendering: "warning",
    Evaluation: "warning",
    Cancelled: "danger",
};

export default function ProcurementDetailSection({
    projectId,
    procurements,
}: ProcurementDetailSectionProps) {
    const items = procurements ?? [];
    const base = `/projects/${projectId}/procurement`;

    const completed = items.filter((p) => p.status === "Completed").length;
    const inProgress = items.filter((p) => IN_PROGRESS.includes(p.status)).length;
    const totalValue = items.reduce(
        (sum, p) => sum + (p.estimated_cost || 0),
        0,
    );

    const recent = [...items]
        .sort(
            (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 5);

    return (
        <section
            aria-labelledby="procurement-section-heading"
            className="rounded-xl border border-line bg-surface"
        >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
                <h2
                    id="procurement-section-heading"
                    className="font-display text-[15px] font-semibold text-ink"
                >
                    Project Procurement
                </h2>
                <div className="flex items-center gap-2">
                    <Link href={base} className={actionSecondary}>
                        View all
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link href={`${base}/procurements/new`} className={actionPrimary}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add procurement
                    </Link>
                </div>
            </header>

            <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Total Procurements"
                        value={items.length}
                        icon={FileText}
                        tone="info"
                    />
                    <StatCard
                        label="Completed"
                        value={completed}
                        icon={CheckCircle}
                        tone="success"
                    />
                    <StatCard
                        label="In Progress"
                        value={inProgress}
                        icon={Clock}
                        tone={inProgress > 0 ? "warning" : "neutral"}
                    />
                    <StatCard
                        label="Total Value"
                        value={`$${totalValue.toLocaleString()}`}
                        hint="Estimated"
                        icon={DollarSign}
                        tone="neutral"
                    />
                </div>

                {recent.length > 0 ? (
                    <div>
                        <h3 className="mb-3 text-[13.5px] font-semibold text-ink">
                            Recent procurements
                        </h3>
                        <ul className="overflow-hidden rounded-xl border border-line">
                            {recent.map((procurement, index) => (
                                <li
                                    key={procurement.procurement_id}
                                    className={`px-4 py-3 transition-colors hover:bg-surface-2 ${
                                        index > 0 ? "border-t border-line" : ""
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="truncate text-[14px] font-medium text-ink">
                                                    {procurement.description}
                                                </h4>
                                                {procurement.type && (
                                                    <StatusBadge
                                                        label={procurement.type}
                                                        tone="neutral"
                                                    />
                                                )}
                                                <StatusBadge
                                                    label={procurement.status}
                                                    tone={STATUS_TONE[procurement.status] ?? "neutral"}
                                                />
                                            </div>

                                            {/* Figures set in tabular numerals so the
                                                amounts line up down the list. */}
                                            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px]">
                                                <div className="flex gap-1.5">
                                                    <dt className="text-muted">Estimated</dt>
                                                    <dd className="font-medium tabular-nums text-ink">
                                                        ${(procurement.estimated_cost || 0).toLocaleString()}
                                                    </dd>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <dt className="text-muted">Actual</dt>
                                                    <dd className="font-medium tabular-nums text-ink">
                                                        ${(procurement.actual_cost || 0).toLocaleString()}
                                                    </dd>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <dt className="text-muted">Contracts</dt>
                                                    <dd className="font-medium tabular-nums text-ink">
                                                        {procurement.contracts?.length || 0}
                                                    </dd>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <dt className="text-muted">Created</dt>
                                                    <dd className="font-medium tabular-nums text-ink">
                                                        {new Date(
                                                            procurement.created_at,
                                                        ).toLocaleDateString()}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>

                                        <RowActions>
                                            <RowAction
                                                icon={Edit}
                                                label={`Edit ${procurement.description}`}
                                                href={`${base}/procurements/${procurement.procurement_id}/edit`}
                                            />
                                        </RowActions>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {items.length > recent.length && (
                            <p className="mt-3 text-[12.5px] text-muted">
                                Showing {recent.length} of {items.length}.{" "}
                                <Link
                                    href={base}
                                    className="font-medium text-bright transition-colors hover:text-bright-deep"
                                >
                                    View all procurements
                                </Link>
                            </p>
                        )}
                    </div>
                ) : (
                    <EmptyState
                        icon={FileText}
                        title="No procurements yet"
                        description="Add the first procurement to track tendering, awards and contract value for this project."
                        action={
                            <Link href={`${base}/procurements/new`} className={actionPrimary}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Add procurement
                            </Link>
                        }
                    />
                )}
            </div>
        </section>
    );
}
