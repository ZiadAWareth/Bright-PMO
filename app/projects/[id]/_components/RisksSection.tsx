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
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Risks</h3>
                <button onClick={() => router.push(`/projects/${projectId}/risk`)} className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                    <ExternalLink size={16} />
                    <span>View All Risks</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">High Risks</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{risks?.filter((risk) => risk.riskLevel === "high").length || 0}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Medium Risks</p>
                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{risks?.filter((risk) => risk.riskLevel === "medium").length || 0}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Low Risks</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{risks?.filter((risk) => risk.riskLevel === "low").length || 0}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-green-500" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Recent Risks</h4>
                {risks && risks.length > 0 ? (
                    <div className="space-y-3">
                        {risks
                            .sort((a, b) => new Date(b.identified_date).getTime() - new Date(a.identified_date).getTime())
                            .slice(0, 5)
                            .map((risk) => (
                                <div key={risk.risk_id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h5 className="font-medium text-gray-900 dark:text-gray-100">{risk.name}</h5>
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${risk.riskLevel === "high" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" : risk.riskLevel === "medium" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"}`}>
                                                    {risk.riskLevel?.toUpperCase()}
                                                </span>
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${risk.status === "closed" ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" : risk.status === "mitigated" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : risk.status === "identified" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"}`}>
                                                    {risk.status?.replace("_", " ").toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{risk.description}</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Owner:</span>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{risk.owner?.account?.first_name} {risk.owner?.account?.last_name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Identified:</span>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(risk.identified_date).toLocaleDateString()}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Score:</span>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{risk.riskScore}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Status:</span>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{risk.currentStatus}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 ml-4">
                                            <button onClick={() => router.push(`/risk/${risk.risk_id}`)} className="flex items-center space-x-1 px-3 py-1 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm">
                                                <Eye size={14} />
                                                <span>View Details</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Risks Yet</h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">This project doesn't have any risks created yet.</p>
                        <button onClick={() => router.push(`/projects/${projectId}/risks`)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">Add First Risk</button>
                    </div>
                )}
            </div>
        </div>
    );
}
