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
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Critical Path Analysis</h3>
                <div className="flex items-center space-x-3">
                    <button onClick={() => router.push(`/projects/${projectId}/critical-path`)} className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">
                        <ExternalLink size={16} />
                        <span>View Detailed Analysis</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-danger-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-danger font-medium">Critical Tasks</p>
                            <p className="text-2xl font-bold text-danger">{project.tasks?.filter((task: any) => task.is_critical_path).length || 0}</p>
                        </div>
                        <Activity className="w-8 h-8 text-danger" />
                    </div>
                </div>
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
                            <p className="text-sm text-success font-medium">Project Duration</p>
                            <p className="text-2xl font-bold text-success">{project.tasks?.filter((task: any) => task.is_critical_path).reduce((sum: number, task: any) => sum + (task.duration || 0), 0) || 0} days</p>
                        </div>
                        <Clock className="w-8 h-8 text-success" />
                    </div>
                </div>
                <div className="bg-warning-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warning font-medium">Max Float</p>
                            <p className="text-2xl font-bold text-warning">{Math.max(...(project.tasks?.map((task: any) => task.total_float || 0) || [0]))} days</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-warning" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-md font-semibold text-ink">Critical Path Tasks</h4>
                <div className="space-y-3">
                    {project.tasks?.filter((task: any) => task.is_critical_path).map((task: any, index: number) => (
                        <div key={task.task_id} className="flex items-center justify-between p-4 bg-danger-soft border border-danger rounded-lg">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-danger text-white rounded-full flex items-center justify-center text-sm font-bold">{index + 1}</div>
                                <div>
                                    <p className="font-medium text-ink">{task.name}</p>
                                    <p className="text-sm text-muted">Duration: {task.duration} days | Float: {task.total_float || 0} days</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted">{task.early_start ? new Date(task.early_start).toLocaleDateString() : "N/A"} - {task.early_finish ? new Date(task.early_finish).toLocaleDateString() : "N/A"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
