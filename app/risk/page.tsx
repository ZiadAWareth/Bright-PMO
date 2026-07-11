"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    AlertTriangle,
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    Eye,
    X,
    Calendar,
    CheckCircle,
    BarChart,
    DollarSign,
    Save,
} from "lucide-react";
import axios from "axios";
import RiskGrid from "@/components/RiskGrid";
import ProjectCalendarView from "@/components/calendar-component";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AddRiskWithProjectModal from "@/components/AddRiskWithProjectModal";
import { toast } from "react-hot-toast";

interface Risk {
    risk_id: number;
    project_id: number;
    name: string;   
    description: string;
    category: string;
    identified_date: string;
    impact: string;
    probability: string;
    riskLevel: string;
    status: string;
    owner_id: number;
    approvalStatus: string;
    currentStatus: string;
    riskScore: number;
    mitigations: RiskMitigation[];
}

interface RiskMitigation {
    mitigation_id: number;
    risk_id: number;
    description: string;
    action_plan: string;
    start_date: string;
    due_date: string;
    status: string;
    responsible_id: number;
    assigned_to: number;
}

interface Project {
    project_id: number;
    name: string;
}

interface User {
    user_id: number;
    account: {
        first_name: string;
        last_name: string;
    };
}

const RiskPage = () => {
    const router = useRouter();
    const [risks, setRisks] = useState<Risk[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filteredRisks, setFilteredRisks] = useState<Risk[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [riskToDelete, setRiskToDelete] = useState<Risk | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<"grid" | "calendar">("grid");
    const [showGrid, setShowGrid] = useState(true);
    const [showCalendar, setShowCalendar] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [riskToEdit, setRiskToEdit] = useState<Risk | null>(null);
    const [editForm, setEditForm] = useState<Partial<Risk>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);

    // Dropdown options (reuse from create page)
    const approvalStatusOptions = ["Pending", "Approved for Mitigation"];
    const statusOptions = ["Open", "Mitigation in Progress", "Closed"];
    const categoryOptions = [
        "Technical",
        "Schedule",
        "Cost",
        "Resource",
        "Quality",
        "Communication",
        "External",
        "Other",
    ];

    // Prepare risk events for calendar
    const riskEvents = risks.map((risk) => ({
        id: risk.risk_id.toString(),
        title: risk.name,
        startDate: risk.identified_date,
        endDate: risk.identified_date,
        type: "critical" as const,
        isOverdue: risk.status === "Overdue",
        status: risk.currentStatus,
        category: risk.category,
        impact: risk.impact,
        probability: risk.probability,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
    }));

    // Statistics for risks (use only currentStatus)
    const totalRisks = risks.length;
    const openRisks = risks.filter(
        (r) => r.currentStatus.toLowerCase() === "open"
    ).length;
    const closedRisks = risks.filter(
        (r) => r.currentStatus.toLowerCase() === "closed"
    ).length;
    const avgRiskScore =
        risks.length > 0
            ? risks.reduce((acc, r) => acc + (r.riskScore || 0), 0) / risks.length
            : 0;

    const renderStatsCards = () => (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Total Risks
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {totalRisks}
                        </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Open Risks
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {openRisks}
                        </p>
                    </div>
                    <BarChart className="w-8 h-8 text-blue-500" />
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Closed Risks
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {closedRisks}
                        </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Avg. Risk Score
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {avgRiskScore}
                        </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-yellow-500" />
                </div>
            </div>
        </div>
    );

    useEffect(() => {
        setLoading(true);
        axios
            .get("/api/risks", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            .then((res) => {
                // Ensure res.data is an array, if not, use empty array
                console.log(res.data.risks);
                const risksData = Array.isArray(res.data.risks)
                    ? res.data.risks
                    : [];
                setRisks(risksData);
                setFilteredRisks(risksData);
                console.log(risksData);
            })
            .catch((err) => {
                console.error("Failed to fetch risks", err);
                // Set empty arrays on error
                setRisks([]);
                setFilteredRisks([]);
            })
            .finally(() => {
                setLoading(false);
            });

        // Fetch all projects for mapping project_id to name
        axios
            .get("/api/projects", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            .then((res) => {
                setProjects(res.data);
            })
            .catch((err) => {
                console.error("Failed to fetch projects", err);
            });

        // Fetch all users for mapping owner_id to name
        axios
            .get("/api/users", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            .then((res) => {
                setUsers(res.data);
            })
            .catch((err) => {
                console.error("Failed to fetch users", err);
            });
    }, []);

    useEffect(() => {
        if (!search) {
            setFilteredRisks(risks);
        } else {
            setFilteredRisks(
                risks.filter(
                    (risk) =>
                        risk.name
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                        risk.category
                            .toLowerCase()
                            .includes(search.toLowerCase())
                )
            );
        }
    }, [search, risks]);

    const handleDelete = (risk: Risk) => {
        setRiskToDelete(risk);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!riskToDelete) return;
        setIsDeleting(true);
        try {
            await axios.delete(`/api/risks/${riskToDelete.risk_id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setRisks(risks.filter((r) => r.risk_id !== riskToDelete.risk_id));
            setShowDeleteModal(false);
        } catch (err) {
            console.error("Delete failed", err);
        } finally {
            setIsDeleting(false);
        }
    };

    // Edit handlers
    const handleEditRisk = (risk: Risk) => {
        setRiskToEdit(risk);
        setEditForm(risk);
        setShowEditModal(true);
    };
    const handleEditChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
    ) => {
        const { name, value } = e.target;
        setEditForm((prev) => {
            const updated = { ...prev, [name]: value };
            if (name === "approvalStatus") {
                return {
                    ...updated,
                    approvalStatus: value,
                    currentStatus:
                        value === "Approved for Mitigation"
                            ? prev.currentStatus || "Open"
                            : "Open",
                };
            }
            return updated;
        });
    };
    const calculateRiskScore = (impact: string, probability: string): number => {
        const impactValue = impact === "high" ? 3 : impact === "medium" ? 2 : 1;
        const probabilityValue = probability === "high" ? 3 : probability === "medium" ? 2 : 1;
        return impactValue * probabilityValue;
    };
    const calculateRiskLevel = (score: number): string => {
        if (score >= 7) return "high";
        if (score >= 4) return "medium";
        return "low";
    };
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!riskToEdit) return;
        
        // Validate required fields
        if (!editForm.name || !editForm.name.trim()) {
            toast.error("Risk name is required");
            return;
        }
        
        if (!editForm.category || !editForm.category.trim()) {
            toast.error("Category is required");
            return;
        }
        
        setIsEditing(true);
        try {
            // Calculate final values
            const finalImpact = editForm.impact ?? riskToEdit.impact;
            const finalProbability = editForm.probability ?? riskToEdit.probability;
            const finalRiskScore = calculateRiskScore(finalImpact, finalProbability);
            const finalRiskLevel = calculateRiskLevel(finalRiskScore);
            await axios.patch(
                `/api/risks/${riskToEdit.risk_id}`,
                {
                    project_id: editForm.project_id ?? riskToEdit.project_id,
                    name: editForm.name.trim(),
                    description: editForm.description ?? riskToEdit.description,
                    identified_date:
                        editForm.identified_date ?? riskToEdit.identified_date,
                    impact: finalImpact,
                    probability: finalProbability,
                    status: editForm.status ?? riskToEdit.status,
                    owner_id: editForm.owner_id ?? riskToEdit.owner_id,
                    approvalStatus:
                        editForm.approvalStatus ?? riskToEdit.approvalStatus,
                    currentStatus: editForm.currentStatus ?? riskToEdit.currentStatus,
                    riskScore: Number(finalRiskScore),
                    riskLevel: finalRiskLevel,
                    category: editForm.category ?? riskToEdit.category,
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );
            // Update risks in state
            setRisks((prev) =>
                prev.map((r) =>
                    r.risk_id === riskToEdit.risk_id
                        ? ({ ...r, ...editForm, riskScore: finalRiskScore, riskLevel: finalRiskLevel } as Risk)
                        : r
                )
            );
            setFilteredRisks((prev) =>
                prev.map((r) =>
                    r.risk_id === riskToEdit.risk_id
                        ? ({ ...r, ...editForm, riskScore: finalRiskScore, riskLevel: finalRiskLevel } as Risk)
                        : r
                )
            );
            setShowEditModal(false);
            toast.success("Risk updated successfully");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to update risk");
        } finally {
            setIsEditing(false);
        }
    };

    // Tab navigation config
    const riskTabs = [
        { id: "grid", label: "Grid View", icon: <AlertTriangle size={16} /> },
        { id: "calendar", label: "Calendar", icon: <Calendar size={16} /> },
    ];

    return (
        <DashboardLayout title="Risk Management">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-600 dark:text-gray-400">
                            Monitor, track, and manage project risks
                        </p>
                    </div>
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={18} /> New Risk
                    </button>
                </div>

                {/* Statistics Cards */}
                {renderStatsCards()}

                {/* Tab Navigation */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl mb-6">
                    <div className="flex items-center space-x-1 p-1 overflow-x-auto whitespace-nowrap">
                        {riskTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as "grid" | "calendar");
                                    setShowGrid(tab.id === "grid");
                                    setShowCalendar(tab.id === "calendar");
                                }}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? "bg-orange-500 text-white shadow-sm"
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700"
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    {/* Grid View Content */}
                    {activeTab === "grid" && showGrid && (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                        <p className="text-gray-600 dark:text-gray-400">Loading risks...</p>
                                    </div>
                                </div>
                            ) : (
                                <RiskGrid
                                    risks={filteredRisks}
                                    onRiskClick={(risk) => {
                                        if (!showEditModal)
                                            router.push(`/risk/${risk.risk_id}`);
                                    }}
                                    onEditRisk={handleEditRisk}
                                    onDeleteRisk={handleDelete}
                                    projectNames={Object.fromEntries(
                                        projects.map((p) => [p.project_id, p.name])
                                    )}
                                    ownerNames={Object.fromEntries(
                                        users.map((u) => [
                                            u.user_id,
                                            `${u.account.first_name} ${u.account.last_name}`,
                                        ])
                                    )}
                                />
                            )}
                        </div>
                    )}
                    {/* Calendar View Content */}
                    {activeTab === "calendar" && showCalendar && (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                        <p className="text-gray-600 dark:text-gray-400">Loading calendar...</p>
                                    </div>
                                </div>
                            ) : (
                                <ProjectCalendarView
                                    events={riskEvents}
                                    onEventClick={(event) => {
                                        const risk = risks.find(
                                            (r) => r.risk_id.toString() === event.id
                                        );
                                        if (risk)
                                            router.push(`/risk/${risk.risk_id}`);
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Delete Modal */}
                {showDeleteModal && riskToDelete && (
                    <div
                        className="fixed inset-0 bg-transparent backdrop-blur-xs z-50 flex items-center justify-center"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowDeleteModal(false);
                            }
                        }}
                    >
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                                        <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        Delete Risk
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Are you sure you want to delete{" "}
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {riskToDelete.name}
                                </span>
                                ? This action cannot be undone and all
                                associated data will be permanently removed.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? "Deleting..." : "Delete Risk"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                    <DialogContent 
                        className="sm:max-w-md"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                        {riskToEdit && (
                            <form
                                onSubmit={handleEditSubmit}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <Edit size={20} className="text-orange-500" />
                                    <h2 className="text-lg font-semibold text-gray-900">Edit Risk</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="name">
                                            Risk Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="name"
                                            name="name"
                                            value={editForm.name || ""}
                                            onChange={handleEditChange}
                                            required
                                            autoFocus={false}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                            placeholder="Enter risk name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="category">
                                            Category <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="category"
                                            name="category"
                                            value={editForm.category || ""}
                                            onChange={handleEditChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                            placeholder="Enter category"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={editForm.description || ""}
                                        onChange={handleEditChange}
                                        rows={3}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder="Describe the risk"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="impact">
                                            Impact
                                        </label>
                                        <select
                                            id="impact"
                                            name="impact"
                                            value={editForm.impact || "medium"}
                                            onChange={handleEditChange}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="probability">
                                            Probability
                                        </label>
                                        <select
                                            id="probability"
                                            name="probability"
                                            value={editForm.probability || "medium"}
                                            onChange={handleEditChange}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="approvalStatus">
                                            Approval Status
                                        </label>
                                        <select
                                            id="approvalStatus"
                                            name="approvalStatus"
                                            value={editForm.approvalStatus || ""}
                                            onChange={handleEditChange}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            {approvalStatusOptions.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currentStatus">
                                            Current Status
                                        </label>
                                        <select
                                            id="currentStatus"
                                            name="currentStatus"
                                            value={editForm.currentStatus || "Open"}
                                            onChange={handleEditChange}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            disabled={editForm.approvalStatus !== "Approved for Mitigation"}
                                        >
                                            {statusOptions.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                        {editForm.approvalStatus !== "Approved for Mitigation" && (
                                            <span className="text-xs text-gray-500">Current Status can only be changed after approval.</span>
                                        )}
                                    </div>
                                </div>
                                {/* Calculated Risk Score Display */}
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Score</span>
                                        <span className="text-lg font-bold text-orange-600">{calculateRiskScore(editForm.impact || riskToEdit.impact, editForm.probability || riskToEdit.probability)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Based on Impact × Probability (High=3, Medium=2, Low=1)
                                    </p>
                                </div>
                                <div className="flex justify-end gap-4 mt-8">
                                    <button
                                        type="button"
                                        className="px-4 py-2 rounded-md text-gray-700 font-medium hover:bg-gray-100"
                                        onClick={() => setShowEditModal(false)}
                                        disabled={isEditing}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 rounded-md bg-orange-500 text-white font-semibold hover:bg-orange-600 flex items-center gap-2 disabled:opacity-60"
                                        disabled={isEditing}
                                    >
                                        {isEditing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                <span>Save Changes</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>

                <AddRiskWithProjectModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={async () => {
                        setShowAddModal(false);
                        // Refresh risks list
                        try {
                            const res = await axios.get("/api/risks", {
                                headers: {
                                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                                },
                            });
                            const risksData = Array.isArray(res.data.risks)
                                ? res.data.risks
                                : [];
                            setRisks(risksData);
                            setFilteredRisks(risksData);
                        } catch (err) {
                            setRisks([]);
                            setFilteredRisks([]);
                        }
                    }}
                    projects={projects}
                />
            </div>
        </DashboardLayout>
    );
};

export default RiskPage;
