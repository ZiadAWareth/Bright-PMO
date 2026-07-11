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
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Work Breakdown Structure</h3>
                <button onClick={() => router.push(`/projects/${projectId}/wbs`)} className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                    <ExternalLink size={16} />
                    <span>View Detailed WBS</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total WBS Items</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{project.wbs?.length || 0}</p>
                        </div>
                        <FolderTree className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Completed</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{project.wbs?.filter((wbs) => wbs.progress_percentage === 100).length || 0}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">In Progress</p>
                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{project.wbs?.filter((wbs) => wbs.progress_percentage > 0 && wbs.progress_percentage < 100).length || 0}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Not Started</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project.wbs?.filter((wbs) => wbs.progress_percentage === 0).length || 0}</p>
                        </div>
                        <Target className="w-8 h-8 text-gray-500" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">WBS Structure Overview</h4>
                {project.wbs && project.wbs.length > 0 ? (
                    <div className="space-y-3">
                        {project.wbs.filter((wbs) => wbs.level === 0).slice(0, 1).map((rootWbs) => (
                            <div key={rootWbs.wbs_id} className="border border-gray-200 dark:border-slate-700 rounded-lg">
                                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-t-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                                <span className="text-sm font-medium text-blue-600">0</span>
                                            </div>
                                            <div>
                                                <h5 className="font-medium text-gray-900 dark:text-gray-100">{rootWbs.name}</h5>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{rootWbs.wbs_code}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rootWbs.progress_percentage}%</p>
                                                <div className="w-24 bg-gray-200 dark:bg-slate-600 rounded-full h-2 mt-1">
                                                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${rootWbs.progress_percentage}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 space-y-2">
                                    {project.wbs.filter((wbs) => wbs.level === 1).slice(0, 3).map((level1Wbs) => (
                                        <div key={level1Wbs.wbs_id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-600 rounded-lg ml-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                                                    <span className="text-xs font-medium text-orange-600">1</span>
                                                </div>
                                                <div>
                                                    <h6 className="text-sm font-medium text-gray-900 dark:text-gray-100">{level1Wbs.name}</h6>
                                                    <p className="text-xs text-gray-500">{level1Wbs.wbs_code}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                                    {new Date(level1Wbs.start_date).toLocaleDateString()} - {new Date(level1Wbs.end_date).toLocaleDateString()}
                                                </span>
                                                <div className="text-right">
                                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{level1Wbs.progress_percentage}%</p>
                                                    <div className="w-16 bg-gray-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-300 ${level1Wbs.progress_percentage === 100 ? "bg-green-500" : level1Wbs.progress_percentage > 0 ? "bg-blue-500" : "bg-gray-400"}`}
                                                            style={{ width: `${level1Wbs.progress_percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {project.wbs.filter((wbs) => wbs.level === 1).length > 3 && (
                                        <div className="text-center py-2 flex flex-col">
                                            <span className="text-sm text-gray-500">and {project.wbs.filter((wbs) => wbs.level === 1).length - 3} more Level 1 items...</span>
                                            <button onClick={() => router.push(`/projects/${projectId}/wbs`)} className="text-orange-600 hover:text-orange-700 font-medium">View All wbs →</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {project.wbs.some((wbs) => wbs.level > 1) && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <FolderTree className="w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                            WBS structure contains {Math.max(...project.wbs.map((wbs) => wbs.level))} levels with detailed breakdown
                                        </span>
                                    </div>
                                    <button onClick={() => router.push(`/projects/${projectId}/wbs`)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Full Structure →</button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                        <FolderTree className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No WBS Structure</h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">This project doesn't have a Work Breakdown Structure yet.</p>
                        <button onClick={() => router.push(`/projects/${projectId}/wbs`)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">Create WBS Structure</button>
                    </div>
                )}
            </div>
        </div>
    );
}
