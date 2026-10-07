"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
    Target,
    CheckCircle,
    Clock,
    AlertTriangle,
    ExternalLink,
    RefreshCw,
    Eye,
} from "lucide-react";
import { ProjectWithRelations } from "@/types/project";

interface MyTasksSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
    currentUserId: number | null;
    handleOpenProgressModal: (type: "project" | "task", id?: number, name?: string) => void;
}

export default function MyTasksSection({
    project,
    projectId,
    router,
    currentUserId,
    handleOpenProgressModal,
}: MyTasksSectionProps) {
    return (
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">
                    My Tasks
                </h3>
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
                            <p className="text-sm text-info font-medium">My Total Tasks</p>
                            <p className="text-2xl font-bold text-info">
                                {project.tasks?.filter((task) =>
                                    task.assigned_users?.some((assignment) => assignment.user.user_id === currentUserId)
                                ).length || 0}
                            </p>
                        </div>
                        <Target className="w-8 h-8 text-info" />
                    </div>
                </div>

                <div className="bg-success-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-success font-medium">Completed</p>
                            <p className="text-2xl font-bold text-success">
                                {project.tasks?.filter(
                                    (task) =>
                                        task.status === "completed" &&
                                        task.assigned_users?.some((assignment) => assignment.user.user_id === currentUserId)
                                ).length || 0}
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
                                {project.tasks?.filter(
                                    (task) =>
                                        task.status === "in_progress" &&
                                        task.assigned_users?.some((assignment) => assignment.user.user_id === currentUserId)
                                ).length || 0}
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
                                {project.tasks?.filter(
                                    (task) =>
                                        new Date(task.end_date) < new Date() &&
                                        task.status !== "completed" &&
                                        task.assigned_users?.some((assignment) => assignment.user.user_id === currentUserId)
                                ).length || 0}
                            </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-danger" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-ink mb-4">My Assigned Tasks</h4>

                {project.tasks &&
                project.tasks.filter((task) =>
                    task.assigned_users?.some((assignment) => assignment.user.user_id === currentUserId)
                ).length > 0 ? (
                    <div className="space-y-3">
                        {project.tasks
                            .filter((task) =>
                                task.assigned_users?.some((assignment) => assignment.user.user_id === currentUserId)
                            )
                            .sort((a, b) => {
                                const aOverdue = new Date(a.end_date) < new Date() && a.status !== "completed";
                                const bOverdue = new Date(b.end_date) < new Date() && b.status !== "completed";
                                if (aOverdue && !bOverdue) return -1;
                                if (!aOverdue && bOverdue) return 1;
                                return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
                            })
                            .map((task) => {
                                const isOverdue = new Date(task.end_date) < new Date() && task.status !== "completed";
                                const daysUntilDue = Math.ceil(
                                    (new Date(task.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                                );

                                return (
                                    <div
                                        key={task.task_id}
                                        className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                                            isOverdue
                                                ? "border-danger bg-danger-soft "
                                                : "border-line"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <h5 className="font-medium text-ink">{task.name}</h5>
                                                    {task.is_milestone && (
                                                        <span className="px-2 py-1 bg-accent-violet-soft text-accent-violet text-xs rounded-full">
                                                            Milestone
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                                                            task.priority === "high"
                                                                ? "bg-danger-soft text-danger  "
                                                                : task.priority === "medium"
                                                                ? "bg-warning-soft text-warning  "
                                                                : "bg-success-soft text-success  "
                                                        }`}
                                                    >
                                                        {task.priority.toUpperCase()}
                                                    </span>
                                                    {isOverdue && (
                                                        <span className="px-2 py-1 bg-danger-soft text-danger text-xs rounded-full">
                                                            OVERDUE
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-sm text-muted mb-3 line-clamp-2">
                                                    {task.description}
                                                </p>

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
                                                        <p
                                                            className={`font-medium ${
                                                                task.status === "completed"
                                                                    ? "text-success"
                                                                    : task.status === "in_progress"
                                                                    ? "text-info"
                                                                    : task.status === "on_hold"
                                                                    ? "text-danger"
                                                                    : "text-muted"
                                                            }`}
                                                        >
                                                            {task.status.replace("_", " ").toUpperCase()}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <span className="text-muted">Progress:</span>
                                                        <div className="flex items-center space-x-2 mt-1">
                                                            <span className="text-sm font-medium text-ink">
                                                                {task.progress_percentage}%
                                                            </span>
                                                            <div className="flex-1 bg-surface-3 rounded-full h-2 min-w-[40px]">
                                                                <div
                                                                    className={`h-2 rounded-full transition-all duration-300 ${
                                                                        task.status === "completed"
                                                                            ? "bg-success"
                                                                            : task.status === "in_progress"
                                                                            ? "bg-info"
                                                                            : isOverdue
                                                                            ? "bg-danger"
                                                                            : "bg-faint"
                                                                    }`}
                                                                    style={{ width: `${task.progress_percentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <span className="text-muted">Hours:</span>
                                                        <p className="font-medium text-ink">
                                                            {task.actual_hours || 0} / {task.estimated_hours || 0}h
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2 ml-4">
                                                <button
                                                    onClick={() => handleOpenProgressModal("task", task.task_id, task.name)}
                                                    className="flex items-center space-x-1 px-3 py-1 bg-info text-white rounded-md hover:opacity-90 transition-colors text-sm"
                                                >
                                                    <RefreshCw size={14} />
                                                    <span>Update</span>
                                                </button>
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
                        <h4 className="text-lg font-medium text-ink mb-2">No Tasks Assigned</h4>
                        <p className="text-muted mb-4">
                            You don't have any tasks assigned to you in this project yet.
                        </p>
                        <button
                            onClick={() => router.push(`/projects/${projectId}/tasks`)}
                            className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
                        >
                            View All Project Tasks
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
