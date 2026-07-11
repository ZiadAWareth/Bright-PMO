"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Plus,
    Search,
    Filter,
    AlertTriangle,
    BarChart3,
    CheckCircle,
    Clock,
    Eye,
    Edit,
    Trash2,
    MoreHorizontal,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import AddRiskModal from "@/components/AddRiskModal";
import AssignMitigationModal from "@/components/AssignMitigationModal";

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
    mitigations?: any[];
}

interface User {
    user_id: number;
    account: {
        first_name: string;
        last_name: string;
    };
    email: string;
    role?: { name?: string };
}

interface Project {
    project_id: number;
    name: string;
}

interface TaskOption {
    task_id: number;
    name: string;
}

const RiskPage = () => {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    // State management
    const [loading, setLoading] = useState(true);
    const [done, setDone] = useState(false);
    const [showNavButtons, setShowNavButtons] = useState(false);
    const [risks, setRisks] = useState<Risk[]>([]);
    const [filteredRisks, setFilteredRisks] = useState<Risk[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [tasks, setTasks] = useState<TaskOption[]>([]);    const [showAssignMitigation, setShowAssignMitigation] = useState(false);
    const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [riskToDelete, setRiskToDelete] = useState<Risk | null>(null);

    // Filter and search states
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const from = params.get("from");
            setShowNavButtons(from === "setup" || from === "previous");
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [projectId]);

    useEffect(() => {
        // Apply filters
        let filtered = risks;

        if (searchQuery) {
            filtered = filtered.filter(
                (risk) =>
                    risk.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    risk.description
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    risk.category
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
            );
        }

        if (categoryFilter !== "all") {
            filtered = filtered.filter(
                (risk) => risk.category === categoryFilter
            );
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter((risk) => risk.status === statusFilter);
        }

        setFilteredRisks(filtered);
    }, [searchQuery, categoryFilter, statusFilter, risks]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            // Fetch project details, risks, users, and tasks in parallel
            const [projectRes, risksRes, usersRes, tasksRes] =
                await Promise.all([
                    axios.get(`/api/projects/${projectId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get(`/api/projects/${projectId}/risks`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get("/api/users", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get(`/api/projects/${projectId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

            setProject(projectRes.data);
            setRisks(risksRes.data);
            setUsers(usersRes.data);
            setTasks(tasksRes.data.tasks);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleBackButton = () => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const from = params.get("from");
            if (from === "previous") {
                router.push(`/projects/${projectId}/setup`);
            } else {
                router.push(`/projects/${projectId}`);
            }
        }
    };

    const handleNext = async () => {
        setLoading(true);
        try {
            const token =
                typeof window !== "undefined"
                    ? localStorage.getItem("token")
                    : null;
            await axios.patch(
                `/api/projects/${projectId}/setup`,
                { risk: true },
                token
                    ? {
                          headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                          },
                      }
                    : undefined
            );
            setDone(true);
            router.push(`/projects/${projectId}/baseline?from=previous`);
        } catch (e) {
            toast.error("Failed to update setup status");
        } finally {
            setLoading(false);
        }
    };

    const handleAddRiskSuccess = () => {
        fetchData(); // Refresh the data
    };    const handleDeleteRisk = async (risk: Risk) => {
        setRiskToDelete(risk);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteRisk = async () => {
        if (!riskToDelete) return;

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`/api/risks/${riskToDelete.risk_id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Risk deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Error deleting risk:", error);
            toast.error("Failed to delete risk");
        } finally {
            setShowDeleteConfirm(false);
            setRiskToDelete(null);
        }
    };

    const handleEditRisk = (risk: Risk) => {
        // Navigate to risk detail page or open edit modal
        router.push(`/risk/${risk.risk_id}`);
    };

    const handleViewRisk = (risk: Risk) => {
        router.push(`/risk/${risk.risk_id}`);
    };

    // Helper functions
    const getOwnerName = (ownerId: number) => {
        const user = users.find((u) => u.user_id === ownerId);
        return user
            ? `${user.account.first_name} ${user.account.last_name}`
            : "Unknown";
    };

    const getRiskLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case "high":
                return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
            case "medium":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
            case "low":
                return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "identified":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
            case "assessed":
                return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
            case "mitigated":
                return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
            case "closed":
                return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
            case "escalated":
                return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
            case "monitoring":
                return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
        }
    };

    const getRiskScoreColor = (score: number) => {
        if (score >= 7) return "text-red-600 dark:text-red-400";
        if (score >= 4) return "text-yellow-600 dark:text-yellow-400";
        return "text-green-600 dark:text-green-400";
    };

    // Get unique categories and statuses for filters
    const categories = Array.from(new Set(risks.map((r) => r.category)));
    const statuses = Array.from(new Set(risks.map((r) => r.status)));

    // Statistics
    const totalRisks = risks.length;
    const highRisks = risks.filter(
        (r) => r.riskLevel.toLowerCase() === "high"
    ).length;
    const openRisks = risks.filter(
        (r) =>
            r.status.toLowerCase() === "identified" ||
            r.status.toLowerCase() === "assessed"
    ).length;
    const closedRisks = risks.filter(
        (r) => r.status.toLowerCase() === "closed"
    ).length;

    if (loading) {
        return (
            <DashboardLayout title="Risk Management">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Risk Management">
            {/* Header with back button and title */}
            <div className="flex items-center justify-between mb-10 border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleBackButton}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                            Risk Management
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-base">
                            {project?.name || "Project"} &mdash; Monitor and
                            manage project risks
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg px-6 py-2 text-base font-semibold"
                >
                    <Plus size={18} className="mr-2" />
                    Add Risk
                </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-orange-500" />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Total Risks
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {totalRisks}
                        </p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                        <BarChart3 className="w-7 h-7 text-red-500" />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            High Risk
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {highRisks}
                        </p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <Clock className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Open Risks
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {openRisks}
                        </p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <CheckCircle className="w-7 h-7 text-green-500" />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Closed Risks
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {closedRisks}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Risk Register
                    </h3>
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className="border-gray-300 dark:border-gray-600"
                    >
                        <Filter size={16} className="mr-2" />
                        Filters
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Search
                        </label>
                        <div className="relative">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                placeholder="Search risks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                    {showFilters && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Category
                                </label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) =>
                                        setCategoryFilter(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="all">All Categories</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>
                                            {category.charAt(0).toUpperCase() +
                                                category.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Status
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="all">All Statuses</option>
                                    {statuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status.charAt(0).toUpperCase() +
                                                status.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredRisks.length} of {totalRisks} risks
                </div>
            </div>

            {/* Risk List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                {filteredRisks.length === 0 ? (
                    <div className="p-16 text-center">
                        <AlertTriangle className="w-14 h-14 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            No risks found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            {risks.length === 0
                                ? "Get started by adding your first risk to this project."
                                : "Try adjusting your search or filter criteria."}
                        </p>
                        <Button
                            onClick={() => setShowAddModal(true)}
                            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 font-semibold"
                        >
                            <Plus size={18} className="mr-2" />
                            Add Risk
                        </Button>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredRisks.map((risk, idx) => (
                            <div
                                key={risk.risk_id}
                                className={`group p-8 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow rounded-2xl flex items-start justify-between border border-gray-200 dark:border-gray-700 ${
                                    idx !== filteredRisks.length - 1
                                        ? "mb-6"
                                        : ""
                                } cursor-pointer`}
                                onClick={() => handleViewRisk(risk)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-4 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-200 dark:bg-orange-900 flex items-center justify-center">
                                            <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <h4 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors">
                                            {risk.name}
                                        </h4>
                                        <span
                                            className={`px-3 py-1 text-xs font-bold rounded-full ${getRiskLevelColor(
                                                risk.riskLevel
                                            )}`}
                                        >
                                            {risk.riskLevel}
                                        </span>
                                        <span
                                            className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(
                                                risk.status
                                            )}`}
                                        >
                                            {risk.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-4 text-base leading-relaxed line-clamp-2">
                                        {risk.description}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                        <span className="flex items-center gap-1">
                                            <BarChart3 size={15} /> Category:{" "}
                                            {risk.category}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Eye size={15} /> Owner:{" "}
                                            {getOwnerName(risk.owner_id)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <AlertTriangle size={15} /> Impact:{" "}
                                            {risk.impact}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={15} /> Probability:{" "}
                                            {risk.probability}
                                        </span>
                                        <span
                                            className={`font-bold ${getRiskScoreColor(
                                                risk.riskScore
                                            )} flex items-center gap-1`}
                                        >
                                            <CheckCircle size={15} /> Score:{" "}
                                            {risk.riskScore}
                                        </span>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-orange-400 text-orange-700 hover:bg-orange-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedRiskId(risk.risk_id);
                                                setShowAssignMitigation(true);
                                            }}
                                        >
                                            Assign Mitigation
                                        </Button>
                                    </div>
                                </div>
                                <div
                                    className="flex items-center space-x-2 ml-4"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewRisk(risk)}
                                        className="border-gray-300 dark:border-gray-600"
                                    >
                                        <Eye size={16} />
                                    </Button>                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleDeleteRisk(risk)
                                        }
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-gray-300 dark:border-gray-600"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            {showNavButtons && (
                <div className="mt-10 flex justify-between">
                    <Button
                        variant="outline"
                        onClick={handleBackButton}
                        disabled={loading}
                        className="border-gray-300 dark:border-gray-600"
                    >
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Setup
                    </Button>
                    <Button
                        onClick={handleNext}
                        disabled={loading || done}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-semibold"
                    >
                        {done ? "Marked as Done" : "Next: Baseline Setup"}
                        <Plus size={16} className="ml-2" />
                    </Button>
                </div>
            )}

            {/* Add Risk Modal */}
            <AddRiskModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={handleAddRiskSuccess}
                projectId={projectId}
            />            <AssignMitigationModal
                isOpen={showAssignMitigation && selectedRiskId !== null}
                onClose={() => setShowAssignMitigation(false)}
                onSuccess={fetchData}
                riskId={selectedRiskId || 0}
                users={users}
                tasks={tasks}
            />            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && riskToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Confirm Risk Deletion
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Are you sure you want to delete {riskToDelete.name}? This action cannot be undone.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setRiskToDelete(null);
                                    }}
                                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setRiskToDelete(null);
                                }}
                                className="px-4 py-2 text-sm font-medium border-gray-300 hover:bg-gray-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmDeleteRisk}
                                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default RiskPage;
