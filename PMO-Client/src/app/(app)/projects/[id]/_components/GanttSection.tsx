"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Target, CheckCircle, Clock, AlertTriangle, Calendar, ExternalLink } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";
import { StatCard } from "@/components/ui/form-shell";

interface GanttSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
    userTasks: any[];
}

export default function GanttSection({ project, projectId, router, userTasks }: GanttSectionProps) {
    return (
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Gantt Chart Overview</h3>
                <button onClick={() => router.push(`/projects/${projectId}/gantt`)} className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">
                    <ExternalLink size={16} />
                    <span>View Full Gantt Chart</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                    label="Total Tasks"
                    value={project.tasks?.length || 0}
                    icon={Target}
                    tone="info"
                />
                <StatCard
                    label="Completed"
                    value={userTasks.filter((task) => task.status === "completed").length}
                    icon={CheckCircle}
                    tone="success"
                />
                <StatCard
                    label="In Progress"
                    value={project.tasks?.filter((task) => task.status === "in_progress").length || 0}
                    icon={Clock}
                    tone="warning"
                />
                <StatCard
                    label="Overdue"
                    value={project.tasks?.filter((task) => new Date(task.end_date) < new Date() && task.status !== "completed").length || 0}
                    icon={AlertTriangle}
                    tone="danger"
                />
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-ink mb-4">Timeline Preview</h4>

                <div className="bg-surface-2 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-ink">Project Timeline</span>
                        <span className="text-sm text-muted">
                            {new Date(project.start_date).toLocaleDateString()} - {new Date(project.planned_end_date).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="w-full bg-surface-3 rounded-full h-3 mb-2">
                        <div className="bg-bright h-3 rounded-full relative" style={{ width: `${project.progress_percentage}%` }}>
                            <div className="absolute right-0 top-0 w-2 h-3 bg-bright rounded-r-full"></div>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted">
                        <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
                        <span>{project.progress_percentage}% Complete</span>
                        <span>End: {new Date(project.planned_end_date).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <h5 className="font-medium text-ink">Key Milestones</h5>
                    {project.tasks.filter((task) => task.is_milestone).slice(0, 5).map((milestone) => (
                        <div key={milestone.task_id} className="flex items-center space-x-4 p-3 border border-line rounded-lg">
                            <div className={`w-3 h-3 rounded-full ${milestone.status === "completed" ? "bg-success" : milestone.status === "in_progress" ? "bg-info" : new Date(milestone.end_date) < new Date() ? "bg-danger" : "bg-faint"}`}></div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h6 className="font-medium text-ink">{milestone.name}</h6>
                                    <span className="text-sm text-muted">{new Date(milestone.end_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-sm text-muted">{milestone.status.replace("_", " ")}</span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-muted">{milestone.progress_percentage}%</span>
                                        <div className="w-16 bg-surface-3 rounded-full h-1">
                                            <div className={`h-1 rounded-full ${milestone.status === "completed" ? "bg-success" : milestone.status === "in_progress" ? "bg-info" : "bg-faint"}`} style={{ width: `${milestone.progress_percentage}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {project.tasks.filter((task) => task.is_milestone).length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-line rounded-lg">
                            <Calendar className="w-8 h-8 text-faint mx-auto mb-2" />
                            <p className="text-muted">No milestones defined yet</p>
                        </div>
                    )}
                </div>

                <div className="rounded-lg border border-line border-l-[3px] border-l-bright bg-surface p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5 text-bright" aria-hidden="true" />
                            <h5 className="font-medium text-ink">Critical Path Analysis</h5>
                        </div>
                        <span className="text-sm text-muted">Advanced view available</span>
                    </div>
                    <p className="text-sm text-muted mb-3">View detailed task dependencies and critical path analysis in the full Gantt chart</p>
                    <button onClick={() => router.push(`/projects/${projectId}/gantt`)} className="inline-flex items-center space-x-2 px-3 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors font-medium text-sm">
                        <span>View detailed critical path analysis</span>
                        <ExternalLink size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
