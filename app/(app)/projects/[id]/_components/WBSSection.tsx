"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { FolderTree, CheckCircle, Clock, Target, ExternalLink } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";

interface WBSSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
}

export default function WBSSection({ project, projectId, router }: WBSSectionProps) {
    return (
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Work Breakdown Structure</h3>
                <button onClick={() => router.push(`/projects/${projectId}/wbs`)} className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">
                    <ExternalLink size={16} />
                    <span>View Detailed WBS</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-info-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-info font-medium">Total WBS Items</p>
                            <p className="text-2xl font-bold text-info">{project.wbs?.length || 0}</p>
                        </div>
                        <FolderTree className="w-8 h-8 text-info" />
                    </div>
                </div>
                <div className="bg-success-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-success font-medium">Completed</p>
                            <p className="text-2xl font-bold text-success">{project.wbs?.filter((wbs) => wbs.progress_percentage === 100).length || 0}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-success" />
                    </div>
                </div>
                <div className="bg-warning-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warning font-medium">In Progress</p>
                            <p className="text-2xl font-bold text-warning">{project.wbs?.filter((wbs) => wbs.progress_percentage > 0 && wbs.progress_percentage < 100).length || 0}</p>
                        </div>
                        <Clock className="w-8 h-8 text-warning" />
                    </div>
                </div>
                <div className="bg-surface-2 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted font-medium">Not Started</p>
                            <p className="text-2xl font-bold text-ink">{project.wbs?.filter((wbs) => wbs.progress_percentage === 0).length || 0}</p>
                        </div>
                        <Target className="w-8 h-8 text-muted" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-ink mb-4">WBS Structure Overview</h4>
                {project.wbs && project.wbs.length > 0 ? (
                    <div className="space-y-3">
                        {project.wbs.filter((wbs) => wbs.level === 0).slice(0, 1).map((rootWbs) => (
                            <div key={rootWbs.wbs_id} className="border border-line rounded-lg">
                                <div className="p-4 bg-surface-2 rounded-t-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-info-soft rounded-full flex items-center justify-center">
                                                <span className="text-sm font-medium text-info">0</span>
                                            </div>
                                            <div>
                                                <h5 className="font-medium text-ink">{rootWbs.name}</h5>
                                                <p className="text-sm text-muted">{rootWbs.wbs_code}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-ink">{rootWbs.progress_percentage}%</p>
                                                <div className="w-24 bg-surface-3 rounded-full h-2 mt-1">
                                                    <div className="bg-info h-2 rounded-full transition-all duration-300" style={{ width: `${rootWbs.progress_percentage}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 space-y-2">
                                    {project.wbs.filter((wbs) => wbs.level === 1).slice(0, 3).map((level1Wbs) => (
                                        <div key={level1Wbs.wbs_id} className="flex items-center justify-between p-3 bg-surface border border-line-2 rounded-lg ml-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-6 h-6 bg-bright-soft rounded-full flex items-center justify-center">
                                                    <span className="text-xs font-medium text-bright">1</span>
                                                </div>
                                                <div>
                                                    <h6 className="text-sm font-medium text-ink">{level1Wbs.name}</h6>
                                                    <p className="text-xs text-muted">{level1Wbs.wbs_code}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <span className="text-xs text-muted">
                                                    {new Date(level1Wbs.start_date).toLocaleDateString()} - {new Date(level1Wbs.end_date).toLocaleDateString()}
                                                </span>
                                                <div className="text-right">
                                                    <p className="text-xs font-medium text-ink">{level1Wbs.progress_percentage}%</p>
                                                    <div className="w-16 bg-surface-3 rounded-full h-1.5 mt-1">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-300 ${level1Wbs.progress_percentage === 100 ? "bg-success" : level1Wbs.progress_percentage > 0 ? "bg-info" : "bg-faint"}`}
                                                            style={{ width: `${level1Wbs.progress_percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {project.wbs.filter((wbs) => wbs.level === 1).length > 3 && (
                                        <div className="text-center py-2 flex flex-col">
                                            <span className="text-sm text-muted">and {project.wbs.filter((wbs) => wbs.level === 1).length - 3} more Level 1 items...</span>
                                            <button onClick={() => router.push(`/projects/${projectId}/wbs`)} className="text-bright hover:text-bright-deep font-medium">View All wbs →</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {project.wbs.some((wbs) => wbs.level > 1) && (
                            <div className="bg-info-soft border border-info rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <FolderTree className="w-5 h-5 text-info" />
                                        <span className="text-sm font-medium text-info">
                                            WBS structure contains {Math.max(...project.wbs.map((wbs) => wbs.level))} levels with detailed breakdown
                                        </span>
                                    </div>
                                    <button onClick={() => router.push(`/projects/${projectId}/wbs`)} className="text-sm text-info hover:text-info font-medium">View Full Structure →</button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                        <FolderTree className="w-12 h-12 text-faint mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-ink mb-2">No WBS Structure</h4>
                        <p className="text-muted mb-4">This project doesn't have a Work Breakdown Structure yet.</p>
                        <button onClick={() => router.push(`/projects/${projectId}/wbs`)} className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">Create WBS Structure</button>
                    </div>
                )}
            </div>
        </div>
    );
}
