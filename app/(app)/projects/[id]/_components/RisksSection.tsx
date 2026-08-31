"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AlertTriangle, ExternalLink, Eye } from "lucide-react";

interface RisksSectionProps {
    risks: any[];
    projectId: string;
    router: AppRouterInstance;
}

export default function RisksSection({ risks, projectId, router }: RisksSectionProps) {
    return (
        <div className="bg-surface border border-line rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">Project Risks</h3>
                <button onClick={() => router.push(`/projects/${projectId}/risk`)} className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">
                    <ExternalLink size={16} />
                    <span>View All Risks</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-danger-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-danger font-medium">High Risks</p>
                            <p className="text-2xl font-bold text-danger">{risks?.filter((risk) => risk.riskLevel === "high").length || 0}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-danger" />
                    </div>
                </div>
                <div className="bg-warning-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warning font-medium">Medium Risks</p>
                            <p className="text-2xl font-bold text-warning">{risks?.filter((risk) => risk.riskLevel === "medium").length || 0}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-warning" />
                    </div>
                </div>
                <div className="bg-success-soft rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-success font-medium">Low Risks</p>
                            <p className="text-2xl font-bold text-success">{risks?.filter((risk) => risk.riskLevel === "low").length || 0}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-success" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-ink mb-4">Recent Risks</h4>
                {risks && risks.length > 0 ? (
                    <div className="space-y-3">
                        {risks
                            .sort((a, b) => new Date(b.identified_date).getTime() - new Date(a.identified_date).getTime())
                            .slice(0, 5)
                            .map((risk) => (
                                <div key={risk.risk_id} className="border border-line rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h5 className="font-medium text-ink">{risk.name}</h5>
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${risk.riskLevel === "high" ? "bg-danger-soft text-danger  " : risk.riskLevel === "medium" ? "bg-warning-soft text-warning  " : "bg-success-soft text-success  "}`}>
                                                    {risk.riskLevel?.toUpperCase()}
                                                </span>
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${risk.status === "closed" ? "bg-surface-2 text-ink-2  " : risk.status === "mitigated" ? "bg-success-soft text-success  " : risk.status === "identified" ? "bg-info-soft text-info  " : "bg-warning-soft text-warning  "}`}>
                                                    {risk.status?.replace("_", " ").toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted mb-2 line-clamp-2">{risk.description}</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div>
                                                    <span className="text-muted">Owner:</span>
                                                    <p className="font-medium text-ink">{risk.owner?.account?.first_name} {risk.owner?.account?.last_name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted">Identified:</span>
                                                    <p className="font-medium text-ink">{new Date(risk.identified_date).toLocaleDateString()}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted">Score:</span>
                                                    <p className="font-medium text-ink">{risk.riskScore}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted">Status:</span>
                                                    <p className="font-medium text-ink">{risk.currentStatus}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 ml-4">
                                            <button onClick={() => router.push(`/risk/${risk.risk_id}`)} className="flex items-center space-x-1 px-3 py-1 border border-line text-ink-3 rounded-md hover:bg-surface-2 transition-colors text-sm">
                                                <Eye size={14} />
                                                <span>View Details</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                        <AlertTriangle className="w-12 h-12 text-faint mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-ink mb-2">No Risks Yet</h4>
                        <p className="text-muted mb-4">This project doesn't have any risks created yet.</p>
                        <button onClick={() => router.push(`/projects/${projectId}/risks`)} className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors">Add First Risk</button>
                    </div>
                )}
            </div>
        </div>
    );
}
