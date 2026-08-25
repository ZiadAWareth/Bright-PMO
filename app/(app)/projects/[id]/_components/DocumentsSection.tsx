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
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Documents</h3>
                <div className="flex items-center space-x-3">
                    <button onClick={() => setShowExportModal(true)} disabled={(project as any).documents?.length === 0} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download size={16} />
                        <span>Export All</span>
                    </button>
                    <label className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">
                        <Upload size={16} />
                        <span>Upload Document</span>
                        <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif" onChange={(e) => handleFileSelect(e.target.files, e.target)} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Documents</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{(project as any).documents?.length || 0}</p>
                        </div>
                        <FileText className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Project Level</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{((project as any).documents || []).filter((doc: any) => !doc.task_id && !doc.wbs_id).length}</p>
                        </div>
                        <FileText className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Task Level</p>
                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{((project as any).documents || []).filter((doc: any) => doc.task_id).length}</p>
                        </div>
                        <Target className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">WBS Level</p>
                            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{((project as any).documents || []).filter((doc: any) => doc.wbs_id).length}</p>
                        </div>
                        <FolderTree className="w-8 h-8 text-orange-500" />
                    </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Size</p>
                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatFileSize(((project as any).documents || []).reduce((total: number, doc: any) => total + (doc.size || 0), 0))}</p>
                        </div>
                        <Archive className="w-8 h-8 text-purple-500" />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {(project as any).documents && (project as any).documents.length > 0 ? (
                    ((project as any).documents || []).map((document: any) => (
                        <div key={document.document_id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-gray-100 dark:bg-slate-600 rounded-lg flex items-center justify-center">
                                    {getFileIcon(document.name)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{document.name}</h4>
                                        {document.task_id && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-xs rounded-full">Task Level</span>}
                                        {document.wbs_id && <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 text-xs rounded-full">WBS Level</span>}
                                        {!document.task_id && !document.wbs_id && <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs rounded-full">Project Level</span>}
                                    </div>
                                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                        <span>{document.name}</span>
                                        <span>•</span>
                                        <span>{formatFileSize(document.size || 0)}</span>
                                        <span>•</span>
                                        <span>Uploaded by {document.uploader?.first_name} {document.uploader?.last_name}</span>
                                        <span>•</span>
                                        <span>{new Date(document.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {document.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{document.description}</p>}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleDownloadDocument(document)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Download">
                                    <Download size={16} />
                                </button>
                                <button onClick={() => handleViewDocument(document)} className="p-2 text-gray-400 hover:text-green-600 transition-colors rounded-full hover:bg-green-50 dark:hover:bg-green-900/20" title="View">
                                    <Eye size={16} />
                                </button>
                                {["admin", "project-manager"].includes(activeView) && (
                                    <button onClick={() => handleDeleteDocument(document)} className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Documents Yet</h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">Upload your first document to get started. Supported formats include PDF, DOC, XLS, PPT, and images.</p>
                        <label className="inline-flex items-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">
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
