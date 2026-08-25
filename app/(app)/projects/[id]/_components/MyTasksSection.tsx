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
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    My Tasks
                </h3>
                <button
                    onClick={() => router.push(`/projects/${projectId}/tasks`)}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                    <ExternalLink size={16} />
                    <span>View All Tasks</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">My Total Tasks</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                {project.tasks?.filter((task) =>
                                    task.assigned_users?.some((assignment) => assignment.user.user_id === currentUserId)
                                ).length || 0}
                            </p>
                        </div>
                        <Target className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Completed</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                {project.tasks?.filter(
                                    (task) =>
                                        task.status === "completed" &&
                                        task.assigned_users?.some((assignment) => assignment.user.user_id === currentUserId)
                                ).length || 0}
                            </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">In Progress</p>
                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                                {project.tasks?.filter(
                                    (task) =>
                                        task.status === "in_progress" &&
                                        task.assigned_users?.some((assignment) => assignment.user.user_id === currentUserId)
                                ).length || 0}
                            </p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Overdue</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                                {project.tasks?.filter(
                                    (task) =>
                                        new Date(task.end_date) < new Date() &&
                                        task.status !== "completed" &&
                                        task.assigned_users?.some((assignment) => assignment.user.user_id === currentUserId)
                                ).length || 0}
                            </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">My Assigned Tasks</h4>

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
                                                ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800"
                                                : "border-gray-200 dark:border-slate-700"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <h5 className="font-medium text-gray-900 dark:text-gray-100">{task.name}</h5>
                                                    {task.is_milestone && (
                                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 text-xs rounded-full">
                                                            Milestone
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                                                            task.priority === "high"
                                                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                                                : task.priority === "medium"
                                                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                                        }`}
                                                    >
                                                        {task.priority.toUpperCase()}
                                                    </span>
                                                    {isOverdue && (
                                                        <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs rounded-full">
                                                            OVERDUE
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                                    {task.description}
                                                </p>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                    <div>
                                                        <span className="text-gray-500">Due Date:</span>
                                                        <p className={`font-medium ${isOverdue ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}>
                                                            {new Date(task.end_date).toLocaleDateString()}
                                                            {isOverdue && <span className="ml-1">(Overdue)</span>}
                                                            {!isOverdue && daysUntilDue <= 3 && daysUntilDue > 0 && (
                                                                <span className="ml-1 text-orange-600">({daysUntilDue} days left)</span>
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <span className="text-gray-500">Status:</span>
                                                        <p
                                                            className={`font-medium ${
                                                                task.status === "completed"
                                                                    ? "text-green-600"
                                                                    : task.status === "in_progress"
                                                                    ? "text-blue-600"
                                                                    : task.status === "on_hold"
                                                                    ? "text-red-600"
                                                                    : "text-gray-600"
                                                            }`}
                                                        >
                                                            {task.status.replace("_", " ").toUpperCase()}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <span className="text-gray-500">Progress:</span>
                                                        <div className="flex items-center space-x-2 mt-1">
                                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                {task.progress_percentage}%
                                                            </span>
                                                            <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2 min-w-[40px]">
                                                                <div
                                                                    className={`h-2 rounded-full transition-all duration-300 ${
                                                                        task.status === "completed"
                                                                            ? "bg-green-500"
                                                                            : task.status === "in_progress"
                                                                            ? "bg-blue-500"
                                                                            : isOverdue
                                                                            ? "bg-red-500"
                                                                            : "bg-gray-400"
                                                                    }`}
                                                                    style={{ width: `${task.progress_percentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <span className="text-gray-500">Hours:</span>
                                                        <p className="font-medium text-gray-900 dark:text-gray-100">
                                                            {task.actual_hours || 0} / {task.estimated_hours || 0}h
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2 ml-4">
                                                <button
                                                    onClick={() => handleOpenProgressModal("task", task.task_id, task.name)}
                                                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                                                >
                                                    <RefreshCw size={14} />
                                                    <span>Update</span>
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/projects/${projectId}/tasks/${task.task_id}`)}
                                                    className="flex items-center space-x-1 px-3 py-1 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm"
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
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                        <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Tasks Assigned</h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            You don't have any tasks assigned to you in this project yet.
                        </p>
                        <button
                            onClick={() => router.push(`/projects/${projectId}/tasks`)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                            View All Project Tasks
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
