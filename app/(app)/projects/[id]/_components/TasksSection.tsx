"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Target, CheckCircle, Clock, AlertTriangle, ExternalLink, Eye } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";

interface TasksSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
}

export default function TasksSection({ project, projectId, router }: TasksSectionProps) {
    return (
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Project Tasks</h3>
                <button
                    onClick={() => router.push(`/projects/${projectId}/tasks`)}
                    className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
                >
                    <ExternalLink size={16} />
                    <span>View All Tasks</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-info-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-info font-medium">Total Tasks</p>
                            <p className="text-2xl font-bold text-info">{project.tasks?.length || 0}</p>
                        </div>
                        <Target className="w-8 h-8 text-info" />
                    </div>
                </div>
                <div className="bg-success-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-success font-medium">Completed</p>
                            <p className="text-2xl font-bold text-success">
                                {project.tasks?.filter((task) => task.status === "completed").length || 0}
                            </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-success" />
                    </div>
                </div>
                <div className="bg-warning-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warning font-medium">In Progress</p>
                            <p className="text-2xl font-bold text-warning">
                                {project.tasks?.filter((task) => task.status === "in_progress").length || 0}
                            </p>
                        </div>
                        <Clock className="w-8 h-8 text-warning" />
                    </div>
                </div>
                <div className="bg-danger-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-danger font-medium">Overdue</p>
                            <p className="text-2xl font-bold text-danger">
                                {project.tasks?.filter((task) => new Date(task.end_date) < new Date() && task.status !== "completed").length || 0}
                            </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-danger" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-ink mb-4">Recent Tasks</h4>

                {project.tasks && project.tasks.length > 0 ? (
                    <div className="space-y-3">
                        {project.tasks
                            .sort((a, b) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime())
                            .slice(0, 5)
                            .map((task) => {
                                const isOverdue = new Date(task.end_date) < new Date() && task.status !== "completed";
                                const daysUntilDue = Math.ceil((new Date(task.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                                return (
                                    <div key={task.task_id} className="border border-line rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <h5 className="font-medium text-ink">{task.name}</h5>
                                                    {task.is_milestone && (
                                                        <span className="px-2 py-1 bg-accent-violet-soft text-accent-violet text-xs rounded-full">Milestone</span>
                                                    )}
                                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${task.priority === "high" ? "bg-danger-soft text-danger  " : task.priority === "medium" ? "bg-warning-soft text-warning  " : "bg-success-soft text-success  "}`}>
                                                        {task.priority.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted mb-3 line-clamp-2">{task.description}</p>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                    <div>
                                                        <span className="text-muted">Due Date:</span>
                                                        <p className={`font-medium ${isOverdue ? "text-danger" : "text-ink"}`}>
                                                            {new Date(task.end_date).toLocaleDateString()}
                                                            {isOverdue && <span className="ml-1">(Overdue)</span>}
                                                            {!isOverdue && daysUntilDue <= 3 && daysUntilDue > 0 && (
                                                                <span className="ml-1 text-bright">({daysUntilDue} days left)</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted">Status:</span>
                                                        <p className={`font-medium ${task.status === "completed" ? "text-success" : task.status === "in_progress" ? "text-info" : task.status === "on_hold" ? "text-danger" : "text-muted"}`}>
                                                            {task.status.replace("_", " ").toUpperCase()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted">Progress:</span>
                                                        <div className="flex items-center space-x-2 mt-1">
                                                            <span className="text-sm font-medium text-ink">{task.progress_percentage}%</span>
                                                            <div className="flex-1 bg-surface-3 rounded-full h-2 min-w-[40px]">
                                                                <div
                                                                    className={`h-2 rounded-full transition-all duration-300 ${task.status === "completed" ? "bg-success" : task.status === "in_progress" ? "bg-info" : isOverdue ? "bg-danger" : "bg-faint"}`}
                                                                    style={{ width: `${task.progress_percentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted">Assigned:</span>
                                                        <p className="font-medium text-ink">
                                                            {task.assigned_users?.length ? `${task.assigned_users.length} member${task.assigned_users.length !== 1 ? "s" : ""}` : "Unassigned"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2 ml-4">
                                                <button
                                                    onClick={() => router.push(`/projects/${projectId}/tasks/${task.task_id}`)}
                                                    className="flex items-center space-x-1 px-3 py-1 border border-line text-ink-3 rounded-md hover:bg-surface-2 transition-colors text-sm"
                                                >
                                                    <Eye size={14} />
                                                    <span>View</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                        <Target className="w-12 h-12 text-faint mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-ink mb-2">No Tasks Yet</h4>
                        <p className="text-muted mb-4">This project doesn't have any tasks created yet.</p>
                        <button onClick={() => router.push(`/projects/${projectId}/tasks`)} className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">
                            Create First Task
                        </button>
                    </div>
                )}

                {project.tasks && project.tasks.length > 5 && (
                    <div className="text-center pt-4 border-t border-line">
                        <p className="text-sm text-muted mb-2">Showing 5 of {project.tasks.length} tasks</p>
                        <button onClick={() => router.push(`/projects/${projectId}/tasks`)} className="text-bright hover:text-bright-deep font-medium">
                            View All {project.tasks.length} Tasks →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
