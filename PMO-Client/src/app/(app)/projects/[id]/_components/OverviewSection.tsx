"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ProjectWithRelations } from "@/types/project";
import ProjectHealthDisplay from "@/components/ProjectHealthDisplay";
import { UserAvatar } from "@/components/ui/person-cell";
import { FormSection, InfoGrid, StatusBadge } from "@/components/ui/form-shell";
import { humanize } from "@/lib/status-tone";

interface OverviewSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
    activeView: string;
    handleHealthScoreUpdate: (score: number) => void;
}

/** Milestone dot colour, keyed by task status. */
const MILESTONE_DOT: Record<string, string> = {
    completed: "bg-success",
    in_progress: "bg-info",
    on_hold: "bg-danger",
};

export default function OverviewSection({
    project,
    projectId,
    router,
    activeView,
    handleHealthScoreUpdate,
}: OverviewSectionProps) {
    const milestones = project.tasks.filter((task) => task.is_milestone);

    const projectRows: [string, React.ReactNode][] = [
        ["Project Code", project.project_code],
        ["Portfolio", project.portfolio.name],
        ["Client", project.client],
        ["Contractor", project.contractor],
        // EPS placement and authorship are administrative facts — they only
        // answer questions an admin is asking, so they stay behind that view.
        ...(activeView === "admin"
            ? ([
                  ["EPS Level", project.eps.name],
                  [
                      "Created By",
                      `${project.creator.account.first_name} ${project.creator.account.last_name}`,
                  ],
              ] as [string, React.ReactNode][])
            : []),
    ];

    const riskLabel =
        project.riskScore > 70 ? "High" : project.riskScore > 40 ? "Medium" : "Low";
    const riskTone =
        project.riskScore > 70 ? "danger" : project.riskScore > 40 ? "warning" : "success";

    const statRows: [string, React.ReactNode][] = [
        [
            "Quality Score",
            <span key="quality" className="tabular-nums">
                {project.qualityScore}%
            </span>,
        ],
        ["Risk Level", <StatusBadge key="risk" label={riskLabel} tone={riskTone} />],
        ...(activeView === "executive"
            ? ([
                  [
                      "Expected ROI",
                      <span key="roi" className="tabular-nums text-success">
                          {project.roi}%
                      </span>,
                  ],
              ] as [string, React.ReactNode][])
            : []),
    ];

    return (
        <div className="space-y-6">
            {/* Full-width: Health's own internal breakdown grid needs the room
                a sidebar column can't give it. */}
            <FormSection title="Project Health">
                <ProjectHealthDisplay
                    projectId={project.project_id}
                    onHealthUpdate={handleHealthScoreUpdate}
                />
            </FormSection>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left: quick-reference facts, lightest content on the tab. */}
                <div className="space-y-6">
                    <FormSection title="Project Information">
                        <InfoGrid rows={projectRows} />

                        {project.description && (
                            <div className="mt-5 border-t border-line-2 pt-4">
                                <div className="mb-1 text-[13px] text-muted">
                                    Description
                                </div>
                                <p className="whitespace-pre-line text-[13.5px] text-ink">
                                    {project.description}
                                </p>
                            </div>
                        )}

                        {project.tags.length > 0 && (
                            <div className="mt-5 border-t border-line-2 pt-4">
                                <div className="mb-2 text-[13px] text-muted">Tags</div>
                                <div className="flex flex-wrap gap-2">
                                    {project.tags.map((tag, index) => (
                                        <StatusBadge key={index} label={tag} tone="info" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </FormSection>

                    <FormSection title={`Team · ${project.team_members.length}`}>
                        <div className="space-y-3">
                            {project.team_members.slice(0, 5).map((member) => (
                                <div key={member.id} className="flex items-center gap-3">
                                    <UserAvatar
                                        name={`${member.user.account.first_name} ${member.user.account.last_name}`}
                                        className="h-8 w-8 text-sm"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13.5px] font-medium text-ink">
                                            {`${member.user.account.first_name} ${member.user.account.last_name}`}
                                        </p>
                                        <p className="truncate text-[11.5px] text-muted">
                                            {humanize(member.user.role.name)}
                                        </p>
                                    </div>
                                    {member.is_lead && (
                                        <StatusBadge label="Lead" tone="info" />
                                    )}
                                </div>
                            ))}
                            {project.team_members.length > 5 && (
                                <button
                                    type="button"
                                    className="w-full py-2 text-[13px] font-medium text-bright transition-colors hover:text-bright-deep"
                                    onClick={() =>
                                        router.push(`/projects/${projectId}/team`)
                                    }
                                >
                                    View all {project.team_members.length} members
                                </button>
                            )}
                        </div>
                    </FormSection>

                    <FormSection title="Quick Stats">
                        {/* One column: this card sits at half width now, still
                            too narrow for InfoGrid's two-column default. */}
                        <div className="[&_dl]:sm:grid-cols-1">
                            <InfoGrid rows={statRows} />
                        </div>
                    </FormSection>
                </div>

                {/* Right: the one genuinely rich list on this tab, given a
                    full half-width column instead of a cramped sidebar. */}
                <div className="space-y-6">
                    <FormSection title="Key Milestones">
                        {milestones.length === 0 ? (
                            <p className="text-[13.5px] text-muted">
                                No milestones have been flagged on this project yet.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {milestones.slice(0, 5).map((milestone) => (
                                    <div
                                        key={milestone.task_id}
                                        className="flex items-start gap-4 rounded-[10px] border border-line p-4"
                                    >
                                        <span
                                            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                                                MILESTONE_DOT[milestone.status] ?? "bg-faint"
                                            }`}
                                            aria-hidden="true"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                                                <h4 className="text-[14px] font-medium text-ink">
                                                    {milestone.name}
                                                </h4>
                                                <span className="whitespace-nowrap text-[12.5px] text-muted">
                                                    {new Date(
                                                        milestone.end_date,
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {milestone.description && (
                                                <p className="mb-2 text-[13px] text-muted">
                                                    {milestone.description}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="text-[11.5px] text-muted">
                                                    Assigned to:{" "}
                                                    {milestone.assigned_users
                                                        ?.map(
                                                            (assignment) =>
                                                                `${assignment.user.account?.first_name} ${assignment.user.account?.last_name}`,
                                                        )
                                                        .join(", ") || "Unassigned"}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11.5px] tabular-nums text-muted">
                                                        {milestone.progress_percentage}%
                                                    </span>
                                                    <div
                                                        className="h-1 w-20 overflow-hidden rounded-full bg-surface-3"
                                                        role="img"
                                                        aria-label={`${milestone.progress_percentage} percent complete`}
                                                    >
                                                        <div
                                                            className="h-full rounded-full bg-info"
                                                            style={{
                                                                width: `${milestone.progress_percentage}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {milestones.length > 5 && (
                                    <button
                                        type="button"
                                        className="w-full py-2 text-[13px] font-medium text-bright transition-colors hover:text-bright-deep"
                                        onClick={() =>
                                            router.push(`/projects/${projectId}/tasks`)
                                        }
                                    >
                                        View all {milestones.length} milestones
                                    </button>
                                )}
                            </div>
                        )}
                    </FormSection>
                </div>
            </div>
        </div>
    );
}
