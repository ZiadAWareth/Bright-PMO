"use client";

import React from "react";
import {
    FileText,
    FolderTree,
    Target,
    Archive,
    Download,
    Upload,
    Eye,
    Trash2,
} from "lucide-react";
import { ProjectWithRelations } from "@/types/project";
import { formatFileSize, getFileIcon } from "./constants";
import {
    EmptyState,
    StatCard,
    StatusBadge,
    RowAction,
    RowActions,
    actionPrimary,
    actionSecondary,
    type BadgeTone,
} from "@/components/ui/form-shell";

interface DocumentsSectionProps {
    project: ProjectWithRelations;
    activeView: string;
    setShowExportModal: (show: boolean) => void;
    handleFileSelect: (files: FileList | null, inputElement?: HTMLInputElement) => void;
    handleDownloadDocument: (doc: any) => void;
    handleViewDocument: (doc: any) => void;
    handleDeleteDocument: (doc: any) => void;
}

const ACCEPT =
    ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif";

/** Where a document is attached, and the badge that marks it. */
function scopeOf(doc: any): { label: string; tone: BadgeTone } {
    if (doc.task_id) return { label: "Task", tone: "warning" };
    if (doc.wbs_id) return { label: "WBS", tone: "brand" };
    return { label: "Project", tone: "success" };
}

export default function DocumentsSection({
    project,
    activeView,
    setShowExportModal,
    handleFileSelect,
    handleDownloadDocument,
    handleViewDocument,
    handleDeleteDocument,
}: DocumentsSectionProps) {
    const documents: any[] = (project as any).documents ?? [];
    const canDelete = ["admin", "project-manager"].includes(activeView);

    const projectLevel = documents.filter((d) => !d.task_id && !d.wbs_id).length;
    const taskLevel = documents.filter((d) => d.task_id).length;
    const wbsLevel = documents.filter((d) => d.wbs_id).length;
    const totalSize = documents.reduce(
        (sum: number, d: any) => sum + (d.size || 0),
        0,
    );

    return (
        <section
            aria-labelledby="documents-section-heading"
            className="rounded-xl border border-line bg-surface"
        >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
                <h2
                    id="documents-section-heading"
                    className="font-display text-[15px] font-semibold text-ink"
                >
                    Project Documents
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowExportModal(true)}
                        disabled={documents.length === 0}
                        className={actionSecondary}
                    >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Export all
                    </button>
                    {/* A label wrapping a hidden input is the upload control, so it
                        carries the button styling. `focus-within` is what keeps it
                        visible to keyboard users: the label itself never receives
                        focus, only the input inside it does. */}
                    <label
                        className={`${actionPrimary} cursor-pointer focus-within:ring-[3px] focus-within:ring-bright-soft`}
                    >
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        Upload document
                        <input
                            type="file"
                            multiple
                            accept={ACCEPT}
                            onChange={(e) => handleFileSelect(e.target.files, e.target)}
                            className="sr-only"
                        />
                    </label>
                </div>
            </header>

            <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Total Documents"
                        value={documents.length}
                        hint={documents.length ? formatFileSize(totalSize) : "Nothing uploaded"}
                        icon={FileText}
                        tone="info"
                    />
                    <StatCard
                        label="Project Level"
                        value={projectLevel}
                        icon={FileText}
                        tone="success"
                    />
                    <StatCard
                        label="Task Level"
                        value={taskLevel}
                        icon={Target}
                        tone="warning"
                    />
                    <StatCard
                        label="WBS Level"
                        value={wbsLevel}
                        icon={FolderTree}
                        tone="brand"
                    />
                </div>

                {documents.length > 0 ? (
                    <ul className="overflow-hidden rounded-xl border border-line">
                        {documents.map((document: any, index: number) => {
                            const scope = scopeOf(document);
                            return (
                                <li
                                    key={document.document_id}
                                    className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2 ${
                                        index > 0 ? "border-t border-line" : ""
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2"
                                    >
                                        {getFileIcon(document.name)}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="truncate text-[14px] font-medium text-ink">
                                                {document.name}
                                            </h3>
                                            <StatusBadge label={scope.label} tone={scope.tone} />
                                        </div>
                                        {/* The file name used to be repeated here beside its own
                                            heading; the meta line now carries only what the
                                            heading does not already say. */}
                                        <p className="mt-0.5 truncate text-[12.5px] text-muted">
                                            {formatFileSize(document.size || 0)}
                                            {document.uploader && (
                                                <>
                                                    {" · "}
                                                    {document.uploader.first_name}{" "}
                                                    {document.uploader.last_name}
                                                </>
                                            )}
                                            {" · "}
                                            {new Date(document.created_at).toLocaleDateString()}
                                        </p>
                                        {document.description && (
                                            <p className="mt-1 truncate text-[12.5px] text-muted">
                                                {document.description}
                                            </p>
                                        )}
                                    </div>

                                    <RowActions>
                                        <RowAction
                                            icon={Download}
                                            label={`Download ${document.name}`}
                                            onClick={() => handleDownloadDocument(document)}
                                        />
                                        <RowAction
                                            icon={Eye}
                                            label={`View ${document.name}`}
                                            onClick={() => handleViewDocument(document)}
                                        />
                                        {canDelete && (
                                            <RowAction
                                                icon={Trash2}
                                                tone="danger"
                                                label={`Delete ${document.name}`}
                                                onClick={() => handleDeleteDocument(document)}
                                            />
                                        )}
                                    </RowActions>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <EmptyState
                        icon={FileText}
                        title="No documents yet"
                        description="Upload the first document to get started. PDF, Word, Excel, PowerPoint and image files are supported."
                        action={
                            <label
                                className={`${actionPrimary} cursor-pointer focus-within:ring-[3px] focus-within:ring-bright-soft`}
                            >
                                <Upload className="h-4 w-4" aria-hidden="true" />
                                Upload your first document
                                <input
                                    type="file"
                                    multiple
                                    accept={ACCEPT}
                                    onChange={(e) => handleFileSelect(e.target.files, e.target)}
                                    className="sr-only"
                                />
                            </label>
                        }
                    />
                )}
            </div>
        </section>
    );
}
