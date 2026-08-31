"use client";

import React from "react";
import { FileText, FolderTree, Target, Archive, Download, Upload, Eye, Trash2 } from "lucide-react";
import { ProjectWithRelations } from "@/types/project";
import { formatFileSize, getFileIcon } from "./constants";

interface DocumentsSectionProps {
    project: ProjectWithRelations;
    activeView: string;
    setShowExportModal: (show: boolean) => void;
    handleFileSelect: (files: FileList | null, inputElement?: HTMLInputElement) => void;
    handleDownloadDocument: (doc: any) => void;
    handleViewDocument: (doc: any) => void;
    handleDeleteDocument: (doc: any) => void;
}

export default function DocumentsSection({ project, activeView, setShowExportModal, handleFileSelect, handleDownloadDocument, handleViewDocument, handleDeleteDocument }: DocumentsSectionProps) {
    return (
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Project Documents</h3>
                <div className="flex items-center space-x-3">
                    <button onClick={() => setShowExportModal(true)} disabled={(project as any).documents?.length === 0} className="flex items-center space-x-2 px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download size={16} />
                        <span>Export All</span>
                    </button>
                    <label className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors cursor-pointer">
                        <Upload size={16} />
                        <span>Upload Document</span>
                        <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif" onChange={(e) => handleFileSelect(e.target.files, e.target)} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-info-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-info font-medium">Total Documents</p>
                            <p className="text-2xl font-bold text-info">{(project as any).documents?.length || 0}</p>
                        </div>
                        <FileText className="w-8 h-8 text-info" />
                    </div>
                </div>
                <div className="bg-success-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-success font-medium">Project Level</p>
                            <p className="text-2xl font-bold text-success">{((project as any).documents || []).filter((doc: any) => !doc.task_id && !doc.wbs_id).length}</p>
                        </div>
                        <FileText className="w-8 h-8 text-success" />
                    </div>
                </div>
                <div className="bg-warning-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warning font-medium">Task Level</p>
                            <p className="text-2xl font-bold text-warning">{((project as any).documents || []).filter((doc: any) => doc.task_id).length}</p>
                        </div>
                        <Target className="w-8 h-8 text-warning" />
                    </div>
                </div>
                <div className="bg-bright-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-bright font-medium">WBS Level</p>
                            <p className="text-2xl font-bold text-bright">{((project as any).documents || []).filter((doc: any) => doc.wbs_id).length}</p>
                        </div>
                        <FolderTree className="w-8 h-8 text-bright" />
                    </div>
                </div>
                <div className="bg-accent-violet-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-accent-violet font-medium">Total Size</p>
                            <p className="text-2xl font-bold text-accent-violet">{formatFileSize(((project as any).documents || []).reduce((total: number, doc: any) => total + (doc.size || 0), 0))}</p>
                        </div>
                        <Archive className="w-8 h-8 text-accent-violet" />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {(project as any).documents && (project as any).documents.length > 0 ? (
                    ((project as any).documents || []).map((document: any) => (
                        <div key={document.document_id} className="flex items-center justify-between p-4 border border-line rounded-lg hover:bg-surface-2 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-surface-2 rounded-lg flex items-center justify-center">
                                    {getFileIcon(document.name)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h4 className="font-medium text-ink">{document.name}</h4>
                                        {document.task_id && <span className="px-2 py-1 bg-warning-soft text-warning text-xs rounded-full">Task Level</span>}
                                        {document.wbs_id && <span className="px-2 py-1 bg-bright-soft text-bright text-xs rounded-full">WBS Level</span>}
                                        {!document.task_id && !document.wbs_id && <span className="px-2 py-1 bg-success-soft text-success text-xs rounded-full">Project Level</span>}
                                    </div>
                                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted">
                                        <span>{document.name}</span>
                                        <span>•</span>
                                        <span>{formatFileSize(document.size || 0)}</span>
                                        <span>•</span>
                                        <span>Uploaded by {document.uploader?.first_name} {document.uploader?.last_name}</span>
                                        <span>•</span>
                                        <span>{new Date(document.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {document.description && <p className="text-sm text-muted mt-1">{document.description}</p>}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleDownloadDocument(document)} className="p-2 text-faint hover:text-info transition-colors rounded-full hover:bg-info-soft" title="Download">
                                    <Download size={16} />
                                </button>
                                <button onClick={() => handleViewDocument(document)} className="p-2 text-faint hover:text-success transition-colors rounded-full hover:bg-success-soft" title="View">
                                    <Eye size={16} />
                                </button>
                                {["admin", "project-manager"].includes(activeView) && (
                                    <button onClick={() => handleDeleteDocument(document)} className="p-2 text-faint hover:text-danger transition-colors rounded-full hover:bg-danger-soft" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-line rounded-lg">
                        <FileText className="w-16 h-16 text-faint mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-ink mb-2">No Documents Yet</h4>
                        <p className="text-muted mb-6">Upload your first document to get started. Supported formats include PDF, DOC, XLS, PPT, and images.</p>
                        <label className="inline-flex items-center space-x-2 px-6 py-3 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors cursor-pointer">
                            <Upload size={20} />
                            <span>Upload Your First Document</span>
                            <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif" onChange={(e) => handleFileSelect(e.target.files, e.target)} className="hidden" />
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
}
