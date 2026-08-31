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
import { Spinner } from "@/components/ui/spinner";
import { Dropdown } from "@/components/ui/dropdown";
import { FormSection, StatusBadge } from "@/components/ui/form-shell";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/entity-card";
import { riskLevelTone, riskStatusTone, humanize } from "@/lib/status-tone";

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

    const getRiskScoreColor = (score: number) => {
        if (score >= 7) return "text-danger";
        if (score >= 4) return "text-warning";
        return "text-success";
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
                    <Spinner size={32} className="text-bright-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title="Risk Management"
            subtitle={`${project?.name || "Project"} — Monitor and manage project risks`}
            backHref={`/projects/${projectId}`}
            backLabel="Back to Project"
            actions={
                <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-bright text-white hover:bg-bright-deep"
                >
                    <Plus size={16} className="mr-2" />
                    Add Risk
                </Button>
            }
        >
            <FormSection title="Register Summary" className="mb-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
                    {(
                        [
                            [AlertTriangle, "text-bright", "Total Risks", totalRisks],
                            [BarChart3, "text-danger", "High Risk", highRisks],
                            [Clock, "text-info", "Open Risks", openRisks],
                            [CheckCircle, "text-success", "Closed Risks", closedRisks],
                        ] as [typeof AlertTriangle, string, string, number][]
                    ).map(([Icon, tone, label, value]) => (
                        <div key={label} className="flex items-center gap-2.5">
                            <Icon className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" />
                            <div className="min-w-0">
                                <p className="text-[12px] text-muted">{label}</p>
                                <p className="text-[20px] font-semibold tabular-nums text-ink">
                                    {value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </FormSection>

            <div className="mb-6">
                <FilterBar
                    search={searchQuery}
                    onSearch={setSearchQuery}
                    searchPlaceholder="Search risks…"
                    resultLabel={`Showing ${filteredRisks.length} of ${totalRisks} risks`}
                    activeCount={
                        (categoryFilter !== "all" ? 1 : 0) +
                        (statusFilter !== "all" ? 1 : 0)
                    }
                    onClear={() => {
                        setCategoryFilter("all");
                        setStatusFilter("all");
                    }}
                >
                    <Dropdown
                        value={String(categoryFilter ?? "")}
                        onChange={(__v: string) => setCategoryFilter(__v)}
                        options={[
                            { value: "all", label: "All Categories" },
                            ...categories.map((category) => ({
                                value: String(category),
                                label: humanize(category),
                            })),
                        ]}
                    />
                    <Dropdown
                        value={String(statusFilter ?? "")}
                        onChange={(__v: string) => setStatusFilter(__v)}
                        options={[
                            { value: "all", label: "All Statuses" },
                            ...statuses.map((status) => ({
                                value: String(status),
                                label: humanize(status),
                            })),
                        ]}
                    />
                </FilterBar>
            </div>

            {/* Risk List */}
            {filteredRisks.length === 0 ? (
                <EmptyState
                    icon={<AlertTriangle className="h-10 w-10" />}
                    title="No risks found"
                    message={
                        risks.length === 0
                            ? "Get started by adding your first risk to this project."
                            : "Try adjusting your search or filter criteria."
                    }
                    action={
                        risks.length === 0 ? (
                            <Button
                                onClick={() => setShowAddModal(true)}
                                className="bg-bright text-white hover:bg-bright-deep"
                            >
                                <Plus size={16} className="mr-2" />
                                Add Risk
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-card">
                    <div className="divide-y divide-line-2">
                        {filteredRisks.map((risk) => (
                            <div
                                key={risk.risk_id}
                                className="group flex cursor-pointer items-start justify-between gap-4 p-5 transition-colors hover:bg-surface-2"
                                onClick={() => handleViewRisk(risk)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-4 mb-3">
                                        <h4 className="truncate text-[15px] font-semibold text-ink transition-colors group-hover:text-bright">
                                            {risk.name}
                                        </h4>
                                        <StatusBadge
                                            label={humanize(risk.riskLevel)}
                                            tone={riskLevelTone(risk.riskLevel)}
                                        />
                                        <StatusBadge
                                            label={humanize(risk.status)}
                                            tone={riskStatusTone(risk.status)}
                                        />
                                    </div>
                                    <p className="mb-3 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
                                        {risk.description}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted">
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
                                            className="border-line text-muted hover:bg-surface-2 hover:text-ink"
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
                                        className="border-line"
                                    >
                                        <Eye size={16} />
                                    </Button>                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleDeleteRisk(risk)
                                        }
                                        className="text-danger hover:text-danger hover:bg-danger-soft border-line"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Navigation Buttons */}
            {showNavButtons && (
                <div className="mt-10 flex justify-between">
                    <Button
                        variant="outline"
                        onClick={handleBackButton}
                        disabled={loading}
                        className="border-line"
                    >
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Setup
                    </Button>
                    <Button
                        onClick={handleNext}
                        disabled={loading || done}
                        className="bg-info hover:opacity-90 text-white px-6 py-2 font-semibold"
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
                    <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-danger-soft flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-danger" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-ink mb-2">
                                        Confirm Risk Deletion
                                    </h3>
                                    <p className="text-sm text-muted leading-relaxed">
                                        Are you sure you want to delete {riskToDelete.name}? This action cannot be undone.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setRiskToDelete(null);
                                    }}
                                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-faint hover:text-muted"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-surface-2 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setRiskToDelete(null);
                                }}
                                className="px-4 py-2 text-sm font-medium border-line hover:bg-surface-2"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmDeleteRisk}
                                className="px-4 py-2 text-sm font-medium bg-danger hover:opacity-90 text-white"
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
