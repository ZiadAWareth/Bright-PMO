"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Lock } from "lucide-react";
import { StatusBadge } from "@/components/ui/form-shell";
import type { SetupStep } from "./ProjectSetupRail";

/**
 * The detail area beneath the setup rail. Its contents swap with the node the
 * user selected, so all seven steps become inspectable instead of only the one
 * the workflow happens to be sitting on.
 *
 * Each of the three states answers a different question: a completed step says
 * what it produced and links to it, the current step says what to do next, and
 * a locked step says what it is waiting for. The old screen answered only the
 * middle one, and left completed steps as a dead "Completed" pill.
 */
export function ProjectSetupStepPanel({
    step,
    isLocked,
    blockedBy,
}: {
    step: SetupStep;
    /** True when the step sits after the current one in the sequence. */
    isLocked: boolean;
    /** The step that has to finish first. Only meaningful while locked. */
    blockedBy?: SetupStep;
}) {
    const Icon = step.icon;
    const done = step.status === "completed";

    const tone = done ? "success" : isLocked ? "neutral" : "brand";
    const label = done ? "Completed" : isLocked ? "Locked" : "In progress";

    return (
        <section className="rounded-[14px] border border-line bg-surface p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                    <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[12px] ${
                            done
                                ? "bg-success-soft text-success"
                                : isLocked
                                  ? "bg-surface-2 text-faint"
                                  : "bg-bright-soft text-bright-deep"
                        }`}
                    >
                        {isLocked ? (
                            <Lock className="h-5 w-5" aria-hidden="true" />
                        ) : (
                            <Icon className="h-5 w-5" aria-hidden="true" />
                        )}
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[17px] font-semibold text-ink">
                                {step.title}
                            </h3>
                            <StatusBadge label={label} tone={tone} />
                        </div>
                        <p className="mt-1 text-[13.5px] text-muted">
                            {step.description}
                        </p>
                    </div>
                </div>

                {!done && !isLocked && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] text-muted">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {step.estimatedTime}
                    </span>
                )}
            </div>

            <div className="mt-5 border-t border-line-2 pt-5">
                {done ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="flex items-start gap-2 text-[13.5px] text-muted">
                            <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-success"
                                aria-hidden="true"
                            />
                            {step.summary}
                        </p>
                        <Link
                            href={step.route}
                            className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-[10px] border border-line px-4 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2"
                        >
                            Review {step.shortLabel}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                ) : isLocked ? (
                    <p className="text-[13.5px] text-muted">
                        This step opens once{" "}
                        <span className="font-medium text-ink">
                            {blockedBy?.title ?? "the earlier steps"}
                        </span>{" "}
                        {blockedBy ? "is complete" : "are complete"}.{" "}
                        {step.unlocks}
                    </p>
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-[13.5px] text-muted">
                            {step.unlocks}
                        </p>
                        <Link
                            href={step.route}
                            className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-[10px] bg-bright px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-bright-deep"
                        >
                            {step.action}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}
