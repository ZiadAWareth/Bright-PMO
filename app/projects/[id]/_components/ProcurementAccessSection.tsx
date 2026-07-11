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
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            {["admin", "project-manager", "pmo", "procurement", "technical", "site"].includes(activeView) ? (
                <>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Procurement Management</h3>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => router.push(`/projects/${projectId}/procurement`)}
                                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                            >
                                <ExternalLink size={16} />
                                <span>View Full Procurement</span>
                            </button>
                        </div>
                    </div>

                    {activeView === "technical" && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                            <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                                    <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">View-Only Access</h3>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        You have read-only access to procurement information. Only authorized roles can make changes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Procurements</p>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{procurements?.length || 0}</p>
                                </div>
                                <FileText className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">Approved</p>
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                        {procurements?.filter((p) => p.status === "approved").length || 0}
                                    </p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                                        {procurements?.filter((p) => p.status === "pending").length || 0}
                                    </p>
                                </div>
                                <Clock className="w-8 h-8 text-yellow-500" />
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">Rejected</p>
                                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                                        {procurements?.filter((p) => p.status === "rejected").length || 0}
                                    </p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Recent Procurement Items</h4>

                        {procurements && procurements.length > 0 ? (
                            <div className="space-y-3">
                                {procurements.slice(0, 5).map((procurement, index) => (
                                    <div key={procurement.id || index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <h5 className="font-medium text-gray-900 dark:text-gray-100">
                                                        {procurement.item_name || "Procurement Item"}
                                                    </h5>
                                                    <span
                                                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                                                            procurement.status === "approved"
                                                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                                                : procurement.status === "pending"
                                                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                                        }`}
                                                    >
                                                        {procurement.status?.toUpperCase() || "PENDING"}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                    {procurement.description || "No description available"}
                                                </p>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                                    <div>
                                                        <span className="text-gray-500">Cost:</span>
                                                        <p className="font-medium text-gray-900 dark:text-gray-100">
                                                            {procurement.cost ? formatCurrency(procurement.cost) : "N/A"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Vendor:</span>
                                                        <p className="font-medium text-gray-900 dark:text-gray-100">{procurement.vendor || "TBD"}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Required Date:</span>
                                                        <p className="font-medium text-gray-900 dark:text-gray-100">
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
                            <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
                                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Procurement Items</h4>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    No procurement items have been created for this project yet.
                                </p>
                                {["admin", "project-manager", "pmo", "procurement"].includes(activeView) && (
                                    <button
                                        onClick={() => router.push(`/projects/${projectId}/procurement`)}
                                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                    >
                                        Add Procurement Item
                                    </button>
                                )}
                            </div>
                        )}

                        {procurements && procurements.length > 5 && (
                            <div className="text-center pt-4 border-t border-gray-200 dark:border-slate-700">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    Showing 5 of {procurements.length} procurement items
                                </p>
                                <button
                                    onClick={() => router.push(`/projects/${projectId}/procurement`)}
                                    className="text-orange-600 hover:text-orange-700 font-medium"
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
                        <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        You don't have permission to view procurement information for this project.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                        Access is restricted to Project Managers, PMO, Administrators, and Procurement team members.
                    </p>
                </div>
            )}
        </div>
    );
}
