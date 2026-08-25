"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Activity, Target, Clock, TrendingUp, ExternalLink } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";

interface CriticalPathSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
}

export default function CriticalPathSection({ project, projectId, router }: CriticalPathSectionProps) {
    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Critical Path Analysis</h3>
                <div className="flex items-center space-x-3">
                    <button onClick={() => router.push(`/projects/${projectId}/critical-path`)} className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                        <ExternalLink size={16} />
                        <span>View Detailed Analysis</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Critical Tasks</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{project.tasks?.filter((task: any) => task.is_critical_path).length || 0}</p>
                        </div>
                        <Activity className="w-8 h-8 text-red-500" />
                    </div>
                </div>
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
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Project Duration</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{project.tasks?.filter((task: any) => task.is_critical_path).reduce((sum: number, task: any) => sum + (task.duration || 0), 0) || 0} days</p>
                        </div>
                        <Clock className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Max Float</p>
                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{Math.max(...(project.tasks?.map((task: any) => task.total_float || 0) || [0]))} days</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">Critical Path Tasks</h4>
                <div className="space-y-3">
                    {project.tasks?.filter((task: any) => task.is_critical_path).map((task: any, index: number) => (
                        <div key={task.task_id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">{index + 1}</div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{task.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Duration: {task.duration} days | Float: {task.total_float || 0} days</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-400">{task.early_start ? new Date(task.early_start).toLocaleDateString() : "N/A"} - {task.early_finish ? new Date(task.early_finish).toLocaleDateString() : "N/A"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
