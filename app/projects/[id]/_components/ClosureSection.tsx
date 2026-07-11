"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { FileText, CheckCircle, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";

interface ClosureSectionProps {
    project: ProjectWithRelations;
    projectId: string;
    router: AppRouterInstance;
}

export default function ClosureSection({ project, projectId, router }: ClosureSectionProps) {
    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Closure Overview</h3>
                <div className="flex items-center space-x-3">
                    <button onClick={() => router.push(`/projects/${projectId}/closure`)} className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                        <ExternalLink size={16} />
                        <span>Manage Closure</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Closure Documents</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{project.closure_documents?.length || 0}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">{project.closure_documents?.filter((doc) => doc.document && doc.approved).length || 0} approved</p>
                        </div>
                        <FileText className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Checklist Items</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                {project.closure_checklists?.filter((item) => item.status === "complete").length || 0}
                                <span className="text-sm text-green-600 dark:text-green-400 font-normal">/{project.closure_checklists?.length || 0}</span>
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                                {project.closure_checklists?.length ? Math.round(((project.closure_checklists?.filter((item) => item.status === "complete").length || 0) / project.closure_checklists.length) * 100) : 0}% complete
                            </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Punch List Items</p>
                            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                                {project.punch_list_items?.filter((item) => item.status === "resolved").length || 0}
                                <span className="text-sm text-orange-600 dark:text-orange-400 font-normal">/{project.punch_list_items?.length || 0}</span>
                            </p>
                            <p className="text-xs text-orange-600 dark:text-orange-400">
                                {project.punch_list_items?.length ? Math.round(((project.punch_list_items?.filter((item) => item.status === "resolved").length || 0) / project.punch_list_items.length) * 100) : 0}% resolved
                            </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-orange-500" />
                    </div>
                </div>
            </div>

            {project.status !== "completed" ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Project Still in Execution Phase</h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">The closure process can only be initiated once the project status is set to &quot;Completed&quot;.</p>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${project.status === "execution" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : project.status === "planning" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"}`}>
                        Current Status: {project.status.replace("_", " ").toUpperCase()}
                    </span>
                </div>
            ) : !project.closure_checklists || project.closure_checklists.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Project Closure Not Started</h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Click &quot;Manage Closure&quot; to start the closure process and manage completion documents, checklists, and punch list items.</p>
                    <button onClick={() => router.push(`/projects/${projectId}/closure`)} className="inline-flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                        <CheckCircle size={20} />
                        <span>Start Closure Process</span>
                    </button>
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Closure Progress Summary</h4>
                        <button onClick={() => router.push(`/projects/${projectId}/closure`)} className="flex items-center space-x-2 px-4 py-2 text-orange-600 border border-orange-600 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                            <ExternalLink size={16} />
                            <span>View Details</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{project.closure_documents?.filter((doc) => !doc.document).length || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Documents pending upload</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">{project.closure_checklists?.filter((item) => item.status === "pending").length || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Checklist items pending</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{project.punch_list_items?.filter((item) => item.status === "open").length || 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Open punch list items</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
