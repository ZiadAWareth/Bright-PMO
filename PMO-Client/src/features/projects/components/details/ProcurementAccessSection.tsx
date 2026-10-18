"use client";

import React from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Eye, ExternalLink, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "./constants";

interface ProcurementAccessSectionProps {
    activeView: string;
    router: AppRouterInstance;
    projectId: string;
    procurements: any[];
}

export default function ProcurementAccessSection({
    activeView,
    router,
    projectId,
    procurements,
}: ProcurementAccessSectionProps) {
    return (
        <div className="bg-surface border border-line rounded-xl p-6">
            {["admin", "project-manager", "pmo", "procurement", "technical", "site"].includes(activeView) ? (
                <>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-ink">Procurement Management</h3>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => router.push(`/projects/${projectId}/procurement`)}
                                className="flex items-center space-x-2 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
                            >
                                <ExternalLink size={16} />
                                <span>View Full Procurement</span>
                            </button>
                        </div>
                    </div>

                    {activeView === "technical" && (
                        <div className="bg-info-soft border border-info rounded-lg p-4 mb-6">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-info-soft rounded-full flex items-center justify-center mr-3">
                                    <Eye className="w-4 h-4 text-info" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-info">View-Only Access</h3>
                                    <p className="text-sm text-info">
                                        You have read-only access to procurement information. Only authorized roles can make changes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

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
                                    <p className="text-sm text-success font-medium">Approved</p>
                                    <p className="text-2xl font-bold text-success">
                                        {procurements?.filter((p) => p.status === "approved").length || 0}
                                    </p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-success" />
                            </div>
                        </div>

                        <div className="bg-warning-soft rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-warning font-medium">Pending</p>
                                    <p className="text-2xl font-bold text-warning">
                                        {procurements?.filter((p) => p.status === "pending").length || 0}
                                    </p>
                                </div>
                                <Clock className="w-8 h-8 text-warning" />
                            </div>
                        </div>

                        <div className="bg-danger-soft rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-danger font-medium">Rejected</p>
                                    <p className="text-2xl font-bold text-danger">
                                        {procurements?.filter((p) => p.status === "rejected").length || 0}
                                    </p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-danger" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-medium text-ink mb-4">Recent Procurement Items</h4>

                        {procurements && procurements.length > 0 ? (
                            <div className="space-y-3">
                                {procurements.slice(0, 5).map((procurement, index) => (
                                    <div key={procurement.id || index} className="border border-line rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <h5 className="font-medium text-ink">
                                                        {procurement.item_name || "Procurement Item"}
                                                    </h5>
                                                    <span
                                                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                                                            procurement.status === "approved"
                                                                ? "bg-success-soft text-success  "
                                                                : procurement.status === "pending"
                                                                ? "bg-warning-soft text-warning  "
                                                                : "bg-danger-soft text-danger  "
                                                        }`}
                                                    >
                                                        {procurement.status?.toUpperCase() || "PENDING"}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted mb-3">
                                                    {procurement.description || "No description available"}
                                                </p>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                                    <div>
                                                        <span className="text-muted">Cost:</span>
                                                        <p className="font-medium text-ink">
                                                            {procurement.cost ? formatCurrency(procurement.cost) : "N/A"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted">Vendor:</span>
                                                        <p className="font-medium text-ink">{procurement.vendor || "TBD"}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted">Required Date:</span>
                                                        <p className="font-medium text-ink">
                                                            {procurement.required_date ? formatDate(procurement.required_date) : "TBD"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-line rounded-lg">
                                <FileText className="w-12 h-12 text-faint mx-auto mb-3" />
                                <h4 className="text-lg font-medium text-ink mb-2">No Procurement Items</h4>
                                <p className="text-muted mb-4">
                                    No procurement items have been created for this project yet.
                                </p>
                                {["admin", "project-manager", "pmo", "procurement"].includes(activeView) && (
                                    <button
                                        onClick={() => router.push(`/projects/${projectId}/procurement`)}
                                        className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
                                    >
                                        Add Procurement Item
                                    </button>
                                )}
                            </div>
                        )}

                        {procurements && procurements.length > 5 && (
                            <div className="text-center pt-4 border-t border-line">
                                <p className="text-sm text-muted mb-2">
                                    Showing 5 of {procurements.length} procurement items
                                </p>
                                <button
                                    onClick={() => router.push(`/projects/${projectId}/procurement`)}
                                    className="text-bright hover:text-bright-deep font-medium"
                                >
                                    View All {procurements.length} Items →
                                </button>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-danger-soft rounded-full">
                            <AlertTriangle className="w-8 h-8 text-danger" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-ink mb-2">Access Denied</h3>
                    <p className="text-muted mb-4">
                        You don't have permission to view procurement information for this project.
                    </p>
                    <p className="text-sm text-faint">
                        Access is restricted to Project Managers, PMO, Administrators, and Procurement team members.
                    </p>
                </div>
            )}
        </div>
    );
}
