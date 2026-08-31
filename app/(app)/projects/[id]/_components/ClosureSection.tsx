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
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Project Closure Overview</h3>
                <div className="flex items-center space-x-3">
                    <button onClick={() => router.push(`/projects/${projectId}/closure`)} className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">
                        <ExternalLink size={16} />
                        <span>Manage Closure</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-info-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-info font-medium">Closure Documents</p>
                            <p className="text-2xl font-bold text-info">{project.closure_documents?.length || 0}</p>
                            <p className="text-xs text-info">{project.closure_documents?.filter((doc) => doc.document && doc.approved).length || 0} approved</p>
                        </div>
                        <FileText className="w-8 h-8 text-info" />
                    </div>
                </div>
                <div className="bg-success-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-success font-medium">Checklist Items</p>
                            <p className="text-2xl font-bold text-success">
                                {project.closure_checklists?.filter((item) => item.status === "complete").length || 0}
                                <span className="text-sm text-success font-normal">/{project.closure_checklists?.length || 0}</span>
                            </p>
                            <p className="text-xs text-success">
                                {project.closure_checklists?.length ? Math.round(((project.closure_checklists?.filter((item) => item.status === "complete").length || 0) / project.closure_checklists.length) * 100) : 0}% complete
                            </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-success" />
                    </div>
                </div>
                <div className="bg-bright-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-bright font-medium">Punch List Items</p>
                            <p className="text-2xl font-bold text-bright">
                                {project.punch_list_items?.filter((item) => item.status === "resolved").length || 0}
                                <span className="text-sm text-bright font-normal">/{project.punch_list_items?.length || 0}</span>
                            </p>
                            <p className="text-xs text-bright">
                                {project.punch_list_items?.length ? Math.round(((project.punch_list_items?.filter((item) => item.status === "resolved").length || 0) / project.punch_list_items.length) * 100) : 0}% resolved
                            </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-bright" />
                    </div>
                </div>
            </div>

            {project.status !== "completed" ? (
                <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                    <Clock className="w-12 h-12 text-faint mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-ink mb-2">Project Still in Execution Phase</h4>
                    <p className="text-muted mb-4">The closure process can only be initiated once the project status is set to &quot;Completed&quot;.</p>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium ${project.status === "execution" ? "bg-info-soft text-info  " : project.status === "planning" ? "bg-warning-soft text-warning  " : "bg-surface-2 text-ink-2  "}`}>
                        Current Status: {project.status.replace("_", " ").toUpperCase()}
                    </span>
                </div>
            ) : !project.closure_checklists || project.closure_checklists.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                    <CheckCircle className="w-12 h-12 text-faint mx-auto mb-3" />
                    <h4 className="text-lg font-medium text-ink mb-2">Project Closure Not Started</h4>
                    <p className="text-muted mb-4">Click &quot;Manage Closure&quot; to start the closure process and manage completion documents, checklists, and punch list items.</p>
                    <button onClick={() => router.push(`/projects/${projectId}/closure`)} className="inline-flex items-center space-x-2 px-6 py-3 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">
                        <CheckCircle size={20} />
                        <span>Start Closure Process</span>
                    </button>
                </div>
            ) : (
                <div className="bg-surface-2 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-ink">Closure Progress Summary</h4>
                        <button onClick={() => router.push(`/projects/${projectId}/closure`)} className="flex items-center space-x-2 px-4 py-2 text-bright border border-bright rounded-lg hover:bg-bright-soft transition-colors">
                            <ExternalLink size={16} />
                            <span>View Details</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-info">{project.closure_documents?.filter((doc) => !doc.document).length || 0}</div>
                            <div className="text-sm text-muted">Documents pending upload</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-warning">{project.closure_checklists?.filter((item) => item.status === "pending").length || 0}</div>
                            <div className="text-sm text-muted">Checklist items pending</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-danger">{project.punch_list_items?.filter((item) => item.status === "open").length || 0}</div>
                            <div className="text-sm text-muted">Open punch list items</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
