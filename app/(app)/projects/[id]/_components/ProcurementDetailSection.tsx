"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Edit, ExternalLink, Plus, FileText, CheckCircle, Clock, DollarSign } from "lucide-react";

interface ProcurementDetailSectionProps {
    projectId: string;
    procurements: any[];
    setProcurements: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function ProcurementDetailSection({ projectId, procurements }: ProcurementDetailSectionProps) {
    const router = useRouter();

    return (
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Project Procurement</h3>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => router.push(`/projects/${projectId}/procurement`)}
                        className="flex items-center space-x-2 px-4 py-2 border border-line rounded-lg text-ink hover:bg-surface-2 transition-colors"
                    >
                        <ExternalLink size={16} />
                        <span>View All</span>
                    </button>
                    <button
                        onClick={() => router.push(`/projects/${projectId}/procurement/procurements/new`)}
                        className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
                    >
                        <Plus size={16} />
                        <span>Add Procurement</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-info-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-info font-medium">Total Procurements</p>
                            <p className="text-2xl font-bold text-info">{procurements?.length || 0}</p>
                        </div>
                        <FileText className="w-8 h-8 text-info" />
                    </div>
                </div>
                <div className="bg-success-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-success font-medium">Completed</p>
                            <p className="text-2xl font-bold text-success">{procurements?.filter((p) => p.status === "Completed").length || 0}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-success" />
                    </div>
                </div>
                <div className="bg-warning-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warning font-medium">In Progress</p>
                            <p className="text-2xl font-bold text-warning">{procurements?.filter((p) => ["Planning", "Tendering", "Evaluation", "Awarded"].includes(p.status)).length || 0}</p>
                        </div>
                        <Clock className="w-8 h-8 text-warning" />
                    </div>
                </div>
                <div className="bg-accent-violet-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-accent-violet font-medium">Total Value</p>
                            <p className="text-2xl font-bold text-accent-violet">${procurements?.reduce((sum, p) => sum + (p.estimated_cost || 0), 0).toLocaleString() || 0}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-accent-violet" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-ink mb-4">Recent Procurements</h4>
                {procurements && procurements.length > 0 ? (
                    <div className="space-y-3">
                        {procurements
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .slice(0, 5)
                            .map((procurement) => (
                                <div key={procurement.procurement_id} className="border border-line rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h5 className="font-medium text-ink">{procurement.description}</h5>
                                                <span className="px-2 py-1 rounded-md text-xs font-medium bg-info-soft text-info">{procurement.type?.toUpperCase()}</span>
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${procurement.status === "Completed" ? "bg-success-soft text-success  " : procurement.status === "Awarded" ? "bg-info-soft text-info  " : procurement.status === "Planning" ? "bg-warning-soft text-warning  " : "bg-surface-2 text-ink-2  "}`}>{procurement.status?.toUpperCase()}</span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div>
                                                    <span className="text-muted">Estimated:</span>
                                                    <p className="font-medium text-ink">${procurement.estimated_cost?.toLocaleString() || 0}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted">Actual:</span>
                                                    <p className="font-medium text-ink">${procurement.actual_cost?.toLocaleString() || 0}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted">Created:</span>
                                                    <p className="font-medium text-ink">{new Date(procurement.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted">Contracts:</span>
                                                    <p className="font-medium text-ink">{procurement.contracts?.length || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/projects/${projectId}/procurement/procurements/${procurement.procurement_id}/edit`)}
                                            className="ml-4 flex items-center space-x-1 px-3 py-1 bg-info text-white text-xs rounded hover:opacity-90"
                                        >
                                            <Edit size={14} />
                                            <span>Edit</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-faint mx-auto mb-4" />
                        <p className="text-muted mb-4">No procurements found for this project.</p>
                        <button
                            onClick={() => router.push(`/projects/${projectId}/procurement/procurements/new`)}
                            className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
                        >
                            Add Procurement
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
