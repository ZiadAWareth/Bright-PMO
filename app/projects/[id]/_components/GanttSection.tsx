"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Target, CheckCircle, Clock, AlertTriangle, Calendar, ExternalLink } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";

interface GanttSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
    userTasks: any[];
}

export default function GanttSection({ project, projectId, router, userTasks }: GanttSectionProps) {
    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gantt Chart Overview</h3>
                <button onClick={() => router.push(`/projects/${projectId}/gantt`)} className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                    <ExternalLink size={16} />
                    <span>View Full Gantt Chart</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Tasks</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{project.tasks?.length || 0}</p>
                        </div>
                        <Target className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Completed</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{userTasks.filter((task) => task.status === "completed").length}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">In Progress</p>
                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{project.tasks?.filter((task) => task.status === "in_progress").length || 0}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Overdue</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{project.tasks?.filter((task) => new Date(task.end_date) < new Date() && task.status !== "completed").length || 0}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Timeline Preview</h4>

                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Project Timeline</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(project.start_date).toLocaleDateString()} - {new Date(project.planned_end_date).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-3 mb-2">
                        <div className="bg-blue-600 h-3 rounded-full relative" style={{ width: `${project.progress_percentage}%` }}>
                            <div className="absolute right-0 top-0 w-2 h-3 bg-blue-800 rounded-r-full"></div>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
                        <span>{project.progress_percentage}% Complete</span>
                        <span>End: {new Date(project.planned_end_date).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">Key Milestones</h5>
                    {project.tasks.filter((task) => task.is_milestone).slice(0, 5).map((milestone) => (
                        <div key={milestone.task_id} className="flex items-center space-x-4 p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                            <div className={`w-3 h-3 rounded-full ${milestone.status === "completed" ? "bg-green-500" : milestone.status === "in_progress" ? "bg-blue-500" : new Date(milestone.end_date) < new Date() ? "bg-red-500" : "bg-gray-400"}`}></div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h6 className="font-medium text-gray-900 dark:text-gray-100">{milestone.name}</h6>
                                    <span className="text-sm text-gray-500">{new Date(milestone.end_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{milestone.status.replace("_", " ")}</span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-500">{milestone.progress_percentage}%</span>
                                        <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-1">
                                            <div className={`h-1 rounded-full ${milestone.status === "completed" ? "bg-green-500" : milestone.status === "in_progress" ? "bg-blue-500" : "bg-gray-400"}`} style={{ width: `${milestone.progress_percentage}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {project.tasks.filter((task) => task.is_milestone).length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                            <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 dark:text-gray-400">No milestones defined yet</p>
                        </div>
                    )}
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <h5 className="font-medium text-amber-900 dark:text-amber-100">Critical Path Analysis</h5>
                        </div>
                        <span className="text-sm text-amber-700 dark:text-amber-300">Advanced view available</span>
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">View detailed task dependencies and critical path analysis in the full Gantt chart</p>
                    <button onClick={() => router.push(`/projects/${projectId}/gantt`)} className="inline-flex items-center space-x-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm">
                        <span>View detailed critical path analysis</span>
                        <ExternalLink size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
