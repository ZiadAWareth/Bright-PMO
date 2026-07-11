"use client";

import React from "react";
import { Plus, FileText, CheckCircle, Clock, DollarSign } from "lucide-react";
import { AddEntityModal } from "@/components/AddEntityModal";
import axios from "axios";
import { toast } from "sonner";

interface ProcurementDetailSectionProps {
    projectId: string;
    procurements: any[];
    setProcurements: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function ProcurementDetailSection({ projectId, procurements, setProcurements }: ProcurementDetailSectionProps) {
    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Procurement</h3>
                <AddEntityModal
                    entityName="Procurement"
                    fields={[
                        { name: "type", label: "Type", type: "select" as const, required: true, defaultValue: "material", options: [{ value: "material", label: "Material" }, { value: "service", label: "Service" }, { value: "equipment", label: "Equipment" }] },
                        { name: "description", label: "Description", type: "textarea" as const, required: true, defaultValue: "" },
                        { name: "estimated_cost", label: "Estimated Cost (OMR)", type: "number" as const, required: true, defaultValue: "", min: 0 },
                        { name: "actual_cost", label: "Actual Cost (OMR)", type: "number" as const, required: false, defaultValue: "", min: 0 },
                        { name: "status", label: "Status", type: "select" as const, required: true, defaultValue: "Planning", options: [{ value: "Planning", label: "Planning" }, { value: "Tendering", label: "Tendering" }, { value: "Evaluation", label: "Evaluation" }, { value: "Awarded", label: "Awarded" }, { value: "Completed", label: "Completed" }, { value: "Cancelled", label: "Cancelled" }] },
                    ]}
                    onSubmit={async (data: Record<string, any>) => {
                        try {
                            const response = await axios.post(`/api/projects/${projectId}/procurements`, { ...data, project_id: projectId }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
                            if (response.status === 201) {
                                toast.success("Procurement added successfully!");
                                const procurementsResponse = await axios.get(`/api/projects/${projectId}/procurements`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
                                setProcurements(procurementsResponse.data);
                            }
                        } catch (error: any) {
                            console.error("Error adding procurement:", error);
                            toast.error(error.response?.data?.message || "Failed to add procurement");
                        }
                    }}
                    triggerButton={
                        <button className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                            <Plus size={16} />
                            <span>Add Procurement</span>
                        </button>
                    }
                />
            </div>

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
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Completed</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{procurements?.filter((p) => p.status === "Completed").length || 0}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">In Progress</p>
                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{procurements?.filter((p) => ["Planning", "Tendering", "Evaluation", "Awarded"].includes(p.status)).length || 0}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Value</p>
                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">${procurements?.reduce((sum, p) => sum + (p.estimated_cost || 0), 0).toLocaleString() || 0}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-purple-500" />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Recent Procurements</h4>
                {procurements && procurements.length > 0 ? (
                    <div className="space-y-3">
                        {procurements
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .slice(0, 5)
                            .map((procurement) => (
                                <div key={procurement.procurement_id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h5 className="font-medium text-gray-900 dark:text-gray-100">{procurement.description}</h5>
                                                <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">{procurement.type?.toUpperCase()}</span>
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${procurement.status === "Completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : procurement.status === "Awarded" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" : procurement.status === "Planning" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"}`}>{procurement.status?.toUpperCase()}</span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Estimated:</span>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">${procurement.estimated_cost?.toLocaleString() || 0}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Actual:</span>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">${procurement.actual_cost?.toLocaleString() || 0}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Created:</span>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(procurement.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Contracts:</span>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">{procurement.contracts?.length || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No procurements found for this project.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
