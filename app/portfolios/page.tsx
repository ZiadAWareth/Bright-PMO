"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    FolderOpen,
    Plus,
    Search,
    Filter,
    Download,
    Edit,
    Trash2,
    Users,
    Calendar,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    Clock,
    MoreHorizontal,
    Eye,
    UserPlus,
    Upload,
    FileText,
    BarChart3,
    Shield,
    TrendingUp,
    Archive,
    Settings,
    Target,
    X,
    AlertCircle,
} from "lucide-react";
import axios from "axios";
import { Portfolio, PortfolioStatus, PortfolioPriority } from "@prisma/client";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import EditPortfolioModal from "@/components/portfolio/EditPortfolioModal";
import CreatePortfolioModal from "@/components/portfolio/CreatePortfolioModal";
import { PortfolioWithRelations } from "@/types/portfolio";

// User interface for role checking
interface User {
    user_id: number;
    first_name: string;
    last_name: string;
    role: {
        role_name?: string;
        name?: string;
    };
}

interface PortfolioWithMetrics extends Omit<Portfolio, "status" | "priority"> {
    status: PortfolioStatus;
    priority: PortfolioPriority;
    manager: {
        first_name: string;
        last_name: string;
    };
    project_count: number;
    total_budget: number;
    total_actual_cost: number;
    avg_progress: number;
    strategic_objective: string;
}

interface FilterState {
    search: string;
    status: PortfolioStatus | "";
    priority: PortfolioPriority | "";
    tag: string;
}

interface ProjectInfo {
    project_id: number;
    name: string;
    status: string;
}

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onForceDelete?: () => void;
    portfolioName: string;
    isDeleting: boolean;
    projectCount?: number;
    projects?: ProjectInfo[];
    hasActiveProjects?: boolean;
    canForceDelete?: boolean;
    showForceDeleteConfirm?: boolean;
    setShowForceDeleteConfirm?: (show: boolean) => void;
}

const DeleteModal = ({
    isOpen,
    onClose,
    onConfirm,
    onForceDelete,
    portfolioName,
    isDeleting,
    projectCount = 0,
    projects = [],
    hasActiveProjects = false,
    canForceDelete = false,
    showForceDeleteConfirm = false,
    setShowForceDeleteConfirm,
}: DeleteModalProps & { showForceDeleteConfirm?: boolean; setShowForceDeleteConfirm?: (show: boolean) => void }) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const activeProjectStatuses = ['planning', 'execution', 'pending_approval', 'approved', 'on_hold'];
    const activeProjects = projects.filter(p => activeProjectStatuses.includes(p.status));
    const completedProjects = projects.filter(p => ['completed', 'closed'].includes(p.status));

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${hasActiveProjects ? 'bg-red-100 dark:bg-red-900' : 'bg-orange-100 dark:bg-orange-900'}`}>
                            <AlertTriangle className={`h-6 w-6 ${hasActiveProjects ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {hasActiveProjects ? 'Cannot Delete Portfolio' : 'Delete Portfolio'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {hasActiveProjects ? (
                    <div className="space-y-4">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <p className="text-red-800 dark:text-red-200 font-medium mb-2">
                                ⚠️ This portfolio cannot be deleted because it contains active projects.
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                Please complete or close all active projects before deleting this portfolio.
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-700 dark:text-gray-300 mb-3">
                                Portfolio <span className="font-semibold">"{portfolioName}"</span> contains:
                            </p>
                            <div className="space-y-2">
                                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                                        Active Projects ({activeProjects.length}):
                                    </p>
                                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                                        {activeProjects.map((project) => (
                                            <li key={project.project_id} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                                                <span className="w-2 h-2 bg-red-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                                <span className="flex-1">
                                                    <span className="font-medium">{project.name || `Project #${project.project_id}`}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 capitalize">({project.status.replace('_', ' ')})</span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {completedProjects.length > 0 && (
                                    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                                            Completed/Closed Projects ({completedProjects.length}):
                                        </p>
                                        <ul className="space-y-1 max-h-24 overflow-y-auto">
                                            {completedProjects.map((project) => (
                                                <li key={project.project_id} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                                    <span className="font-medium">{project.name || `Project #${project.project_id}`}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-400">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {portfolioName}
                            </span>
                            ? This action cannot be undone.
                        </p>
                        {projectCount > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                                    ⚠️ Warning: This will permanently delete {projectCount} project(s):
                                </p>
                                <ul className="space-y-1 max-h-32 overflow-y-auto">
                                    {projects.slice(0, 10).map((project) => (
                                        <li key={project.project_id} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start">
                                            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                            <span className="flex-1">
                                                <span className="font-medium">{project.name || `Project #${project.project_id}`}</span>
                                                <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-2 capitalize">({project.status.replace('_', ' ')})</span>
                                            </span>
                                        </li>
                                    ))}
                                    {projects.length > 10 && (
                                        <li className="text-sm text-yellow-600 dark:text-yellow-400 italic">
                                            ... and {projects.length - 10} more project(s)
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            All associated data including projects, tasks, budgets, and documents will be permanently removed.
                        </p>
                    </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {hasActiveProjects ? 'Close' : 'Cancel'}
                    </button>
                    {hasActiveProjects && canForceDelete && (
                        <button
                            onClick={() => setShowForceDeleteConfirm?.(true)}
                            disabled={isDeleting}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Force Delete
                        </button>
                    )}
                    {!hasActiveProjects && (
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDeleting ? "Deleting..." : "Delete Portfolio"}
                        </button>
                    )}
                </div>

                {/* Force Delete Confirmation Modal */}
                {showForceDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 border-2 border-red-500 dark:border-red-600 rounded-xl p-6 max-w-md w-full shadow-2xl">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-4">
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        Force Delete Portfolio
                                    </h3>
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                        DANGEROUS OPERATION
                                    </p>
                                </div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                                <p className="text-red-800 dark:text-red-200 font-medium mb-2">
                                    ⚠️ This will permanently delete:
                                </p>
                                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                    <li>• The portfolio "{portfolioName}"</li>
                                    <li>• {activeProjects.length} active project(s) and all their data</li>
                                    <li>• All tasks, budgets, documents, and related records</li>
                                </ul>
                                <p className="text-sm text-red-600 dark:text-red-400 mt-3 font-medium">
                                    This action CANNOT be undone!
                                </p>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 mb-4">
                                Type <strong className="text-red-600">DELETE</strong> to confirm:
                            </p>
                            <input
                                type="text"
                                id="force-delete-confirm"
                                placeholder="Type DELETE"
                                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                autoFocus
                            />
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowForceDeleteConfirm?.(false)}
                                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const input = document.getElementById('force-delete-confirm') as HTMLInputElement;
                                        if (input?.value === 'DELETE') {
                                            setShowForceDeleteConfirm?.(false);
                                            onForceDelete?.();
                                        } else {
                                            toast.error("Please type 'DELETE' to confirm", {
                                                icon: <AlertCircle className="text-red-500" />,
                                            });
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Force Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function PortfoliosPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<"grid" | "list">("grid");
    const [portfolios, setPortfolios] = useState<PortfolioWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        search: "",
        status: "",
        priority: "",
        tag: "",
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [portfolioToDelete, setPortfolioToDelete] =
        useState<PortfolioWithRelations | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteModalProjects, setDeleteModalProjects] = useState<ProjectInfo[]>([]);
    const [hasActiveProjects, setHasActiveProjects] = useState(false);
    const [showForceDeleteConfirm, setShowForceDeleteConfirm] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [portfolioToEdit, setPortfolioToEdit] =
        useState<PortfolioWithRelations | null>(null);

    // Permission checking functions
    const canViewPortfolios = () => {
        const roleName = user?.role?.role_name || user?.role?.name;
        return (
            roleName && ["PMO", "PJM", "ADMIN", "IT", "DIR"].includes(roleName)
        );
    };

    const canManagePortfolios = () => {
        const roleName = user?.role?.role_name || user?.role?.name;
        return !!(roleName && ["PMO", "PJM", "ADMIN", "DIR"].includes(roleName));
    };

    // Fetch user data function
    const fetchUserData = async () => {
        try {
            const response = await axios.get("/api/auth/me", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });
            setUser(response.data.user);
        } catch (error) {
            console.error("Error fetching user data:", error);
            setUser(null);
        }
    };

    useEffect(() => {
        fetchUserData();
        fetchPortfolios();
    }, []);

    const fetchPortfolios = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            const token = localStorage.getItem("token");
            if (!token) {
                toast.error("Authentication token not found. Please log in.", {
                    icon: <AlertCircle className="text-red-500" />,
                    className: "glass-error",
                });
                return;
            }
            const response = await axios.get("/api/portfolios", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setPortfolios(response.data);
        } catch (error) {
            console.error("Error fetching portfolios:", error);
            toast.error("Failed to fetch portfolios", {
                icon: <AlertCircle className="text-red-500" />,
                className: "glass-error",
            });
        } finally {
            if (isRefresh) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    const applyFilters = (portfolios: PortfolioWithRelations[]) => {
        return portfolios.filter((portfolio) => {
            const matchesSearch =
                portfolio.name
                    .toLowerCase()
                    .includes(filters.search.toLowerCase()) ||
                portfolio.description
                    ?.toLowerCase()
                    .includes(filters.search.toLowerCase()) ||
                `${portfolio.manager.first_name} ${portfolio.manager.last_name}`
                    .toLowerCase()
                    .includes(filters.search.toLowerCase()) ||
                (portfolio.tags && portfolio.tags.some(tag => 
                    tag.toLowerCase().includes(filters.search.toLowerCase())
                ));

            const matchesStatus =
                !filters.status || portfolio.status === filters.status;
            const matchesPriority =
                !filters.priority || portfolio.priority === filters.priority;
            const matchesTag =
                !filters.tag || (portfolio.tags && portfolio.tags.includes(filters.tag));

            return matchesSearch && matchesStatus && matchesPriority && matchesTag;
        });
    };

    // Get all unique tags from portfolios for filter dropdown
    const getAllTags = () => {
        const tagSet = new Set<string>();
        portfolios.forEach(portfolio => {
            if (portfolio.tags && portfolio.tags.length > 0) {
                portfolio.tags.forEach(tag => tagSet.add(tag));
            }
        });
        return Array.from(tagSet).sort();
    };

    const handleDeleteClick = async (portfolio: PortfolioWithRelations) => {
        if (!canManagePortfolios()) {
            toast.error("You don't have permission to delete portfolios");
            return;
        }
        setPortfolioToDelete(portfolio);
        
        // Extract project information from portfolio - ensure we get name field
        // Handle both full project objects and minimal project objects
        const projects: ProjectInfo[] = (portfolio.projects || []).map((p: any) => {
            // Try different possible field names
            const projectName = p.name || p.project_name || `Project #${p.project_id}`;
            const projectStatus = p.status || 'unknown';
            return {
                project_id: p.project_id,
                name: projectName,
                status: projectStatus
            };
        });
        
        const activeProjectStatuses = ['planning', 'execution', 'pending_approval', 'approved', 'on_hold'];
        const activeProjects = projects.filter(p => activeProjectStatuses.includes(p.status));
        
        setDeleteModalProjects(projects);
        setHasActiveProjects(activeProjects.length > 0);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async (forceDelete = false) => {
        if (!portfolioToDelete || (hasActiveProjects && !forceDelete)) return;

        setIsDeleting(true);

        try {
            const token = localStorage.getItem("token");

            const response = await axios.delete(
                `/api/portfolios/${portfolioToDelete.portfolio_id}${forceDelete ? '?force=true' : ''}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.status === 200) {
                setPortfolios((prevPortfolios) =>
                    prevPortfolios.filter(
                        (p) => p.portfolio_id !== portfolioToDelete.portfolio_id
                    )
                );
                setShowDeleteModal(false);
                toast.success(
                    forceDelete 
                        ? "Portfolio force deleted successfully (including active projects)" 
                        : "Portfolio deleted successfully",
                    {
                        icon: <CheckCircle className="text-green-500" />,
                        className: "glass-success",
                    }
                );
            }
        } catch (error: any) {
            console.error("Error deleting portfolio:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to delete portfolio. Please try again.";
            
            if (error.response?.status === 403 && error.response?.data?.activeProjects && !forceDelete) {
                // Update modal with fresh data from API
                const activeProjects = error.response.data.activeProjects;
                setDeleteModalProjects(activeProjects);
                setHasActiveProjects(true);
                toast.error(errorMessage, {
                    icon: <AlertCircle className="text-red-500" />,
                    className: "glass-error",
                });
            } else {
                toast.error(errorMessage, {
                    icon: <AlertCircle className="text-red-500" />,
                    className: "glass-error",
                });
            }
        } finally {
            setIsDeleting(false);
            setPortfolioToDelete(null);
            setShowDeleteModal(false);
            setDeleteModalProjects([]);
            setHasActiveProjects(false);
        }
    };

    const handleForceDelete = () => {
        handleDeleteConfirm(true);
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setPortfolioToDelete(null);
        setDeleteModalProjects([]);
        setHasActiveProjects(false);
        setShowForceDeleteConfirm(false);
    };

    const getStatusBadge = (status: PortfolioStatus) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium";
            case "completed":
                return "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium";
            case "on_hold":
                return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium";
            case "archived":
                return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium";
            default:
                return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium";
        }
    };

    const getPriorityBadge = (priority: PortfolioPriority) => {
        switch (priority) {
            case "high":
                return "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium";
            case "medium":
                return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium";
            case "low":
                return "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium";
            default:
                return "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium";
        }
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 75) return "bg-green-600";
        if (percentage >= 50) return "bg-blue-600";
        if (percentage >= 25) return "bg-yellow-600";
        return "bg-red-600";
    };

    const handleEditClick = (portfolio: PortfolioWithRelations) => {
        if (!canManagePortfolios()) {
            toast.error("You don't have permission to edit portfolios");
            return;
        }
        setPortfolioToEdit(portfolio);
        setShowEditModal(true);
    };

    const handleCreateClick = () => {
        if (!canManagePortfolios()) {
            toast.error("You don't have permission to create portfolios");
            return;
        }
        setShowCreateModal(true);
    };

    const handleEditSuccess = () => {
        fetchPortfolios(true);
        toast.success("Portfolio updated successfully", {
            icon: <CheckCircle className="text-green-500" />,
            className: "glass-success",
        });
    };

    const filteredPortfolios = applyFilters(portfolios);

    // Check if user has permission to view portfolios
    if (user && !canViewPortfolios()) {
        return (
            <ProtectedRoute>
                <DashboardLayout>
                    <div className="flex items-center justify-center min-h-96">
                        <div className="text-center">
                            <Shield
                                size={48}
                                className="text-gray-300 mx-auto mb-4"
                            />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                Access Restricted
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                You don't have permission to view portfolios.
                            </p>
                        </div>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <DashboardLayout title="Portfolio Management">
                <div className="p-6">
                    {/* Loading State */}
                    {loading ? (
                        <div className="flex items-center justify-center min-h-96">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Loading portfolios...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {filteredPortfolios.length} portfolios
                                    </span>
                                    {refreshing && (
                                        <div className="flex items-center space-x-2 text-sm text-orange-600">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                                            <span>Refreshing...</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() =>
                                            setShowFilters(!showFilters)
                                        }
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                    >
                                        <Filter size={16} className="mr-2" />
                                        Filters
                                    </button>
                                    {canManagePortfolios() && (
                                        <button
                                            onClick={handleCreateClick}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                        >
                                            <Plus size={16} className="mr-2" />
                                            Create Portfolio
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filters */}
                            {showFilters && (
                                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm p-4 mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            Filters
                                        </h2>
                                        <button
                                            onClick={() =>
                                                setShowFilters(false)
                                            }
                                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label
                                                htmlFor="search"
                                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                                            >
                                                Search
                                            </label>
                                            <input
                                                id="search"
                                                type="text"
                                                placeholder="Search portfolios..."
                                                value={filters.search}
                                                onChange={(e) =>
                                                    setFilters({
                                                        ...filters,
                                                        search: e.target.value,
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="status"
                                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                                            >
                                                Status
                                            </label>
                                            <select
                                                id="status"
                                                value={filters.status}
                                                onChange={(e) =>
                                                    setFilters({
                                                        ...filters,
                                                        status: e.target
                                                            .value as PortfolioStatus,
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                            >
                                                <option value="">
                                                    All Status
                                                </option>
                                                <option value="active">
                                                    Active
                                                </option>
                                                <option value="completed">
                                                    Completed
                                                </option>
                                                <option value="on_hold">
                                                    On Hold
                                                </option>
                                                <option value="archived">
                                                    Archived
                                                </option>
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="priority"
                                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                                            >
                                                Priority
                                            </label>
                                            <select
                                                id="priority"
                                                value={filters.priority}
                                                onChange={(e) =>
                                                    setFilters({
                                                        ...filters,
                                                        priority: e.target
                                                            .value as PortfolioPriority,
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                            >
                                                <option value="">
                                                    All Priority
                                                </option>
                                                <option value="high">
                                                    High
                                                </option>
                                                <option value="medium">
                                                    Medium
                                                </option>
                                                <option value="low">Low</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="tag"
                                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                                            >
                                                Tag
                                            </label>
                                            <select
                                                id="tag"
                                                value={filters.tag}
                                                onChange={(e) =>
                                                    setFilters({
                                                        ...filters,
                                                        tag: e.target.value,
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                            >
                                                <option value="">
                                                    All Tags
                                                </option>
                                                {getAllTags().map((tag) => (
                                                    <option key={tag} value={tag}>
                                                        {tag}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Portfolio Grid */}
                            {filteredPortfolios.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <FolderOpen
                                        size={48}
                                        className="text-gray-300 mb-4"
                                    />
                                    <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                                        No portfolios found matching your
                                        criteria.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredPortfolios.map((portfolio) => (
                                        <div
                                            key={portfolio.portfolio_id}
                                            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                                            onClick={() =>
                                                router.push(
                                                    `/portfolios/${portfolio.portfolio_id}`
                                                )
                                            }
                                        >
                                            <div className="flex items-center space-x-2 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                    {portfolio.name}
                                                </h3>
                                                <span
                                                    className={getStatusBadge(
                                                        portfolio.status
                                                    )}
                                                >
                                                    {portfolio.status.replace(
                                                        "_",
                                                        " "
                                                    )}
                                                </span>
                                                <span
                                                    className={getPriorityBadge(
                                                        portfolio.priority
                                                    )}
                                                >
                                                    {portfolio.priority}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3 break-words">
                                                {portfolio.description}
                                            </p>

                                            {/* Tags */}
                                            {portfolio.tags && portfolio.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-4">
                                                    {portfolio.tags.slice(0, 3).map((tag, index) => (
                                                        <span
                                                            key={index}
                                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {portfolio.tags.length > 3 && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                                            +{portfolio.tags.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Key Metrics */}
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <FolderOpen size={16} />
                                                    <span>
                                                        {
                                                            portfolio.project_count
                                                        }{" "}
                                                        Projects
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <DollarSign size={16} />
                                                    <span>
                                                        {portfolio.total_budget.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress Section */}
                                            <div className="mb-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Progress
                                                    </span>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        {portfolio.avg_progress.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                                                    <div
                                                        className={`${getProgressColor(
                                                            portfolio.avg_progress
                                                        )} h-2 rounded-full transition-all duration-300`}
                                                        style={{
                                                            width: `${portfolio.avg_progress}%`,
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Budget Section */}
                                            <div className="mb-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Budget
                                                    </span>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        $
                                                        {portfolio.total_actual_cost.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                                                    {portfolio.total_budget >
                                                    0 ? (
                                                        <div
                                                            className={`${getProgressColor(
                                                                (portfolio.total_actual_cost /
                                                                    portfolio.total_budget) *
                                                                    100
                                                            )} h-2 rounded-full transition-all duration-300`}
                                                            style={{
                                                                width: `${Math.min(
                                                                    (portfolio.total_actual_cost /
                                                                        portfolio.total_budget) *
                                                                        100,
                                                                    100
                                                                )}%`,
                                                            }}
                                                        ></div>
                                                    ) : (
                                                        <div
                                                            className="bg-gray-400 h-2 rounded-full transition-all duration-300"
                                                            style={{
                                                                width: "0%",
                                                            }}
                                                        ></div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        Manager:{" "}
                                                        {
                                                            portfolio.manager
                                                                .first_name
                                                        }{" "}
                                                        {
                                                            portfolio.manager
                                                                .last_name
                                                        }
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(
                                                                `/portfolios/${portfolio.portfolio_id}`
                                                            );
                                                        }}
                                                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {canManagePortfolios() && (
                                                        <>
                                                            <button
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleEditClick(
                                                                        portfolio
                                                                    );
                                                                }}
                                                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
                                                            >
                                                                <Edit
                                                                    size={16}
                                                                />
                                                            </button>
                                                            <button
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteClick(
                                                                        portfolio
                                                                    );
                                                                }}
                                                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                            >
                                                                <Trash2
                                                                    size={16}
                                                                />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                <DeleteModal
                    isOpen={showDeleteModal}
                    onClose={handleDeleteCancel}
                    onConfirm={() => handleDeleteConfirm(false)}
                    onForceDelete={handleForceDelete}
                    portfolioName={portfolioToDelete?.name || ""}
                    isDeleting={isDeleting}
                    projectCount={deleteModalProjects.length}
                    projects={deleteModalProjects}
                    hasActiveProjects={hasActiveProjects}
                    canForceDelete={!!(canManagePortfolios() && (user?.role?.role_name === 'ADMIN' || user?.role?.name === 'ADMIN'))}
                    showForceDeleteConfirm={showForceDeleteConfirm}
                    setShowForceDeleteConfirm={setShowForceDeleteConfirm}
                />

                {/* Edit Portfolio Modal */}
                <EditPortfolioModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setPortfolioToEdit(null);
                    }}
                    portfolio={portfolioToEdit}
                    onSuccess={handleEditSuccess}
                />

                {/* Create Portfolio Modal */}
                <CreatePortfolioModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        fetchPortfolios(true);
                        toast.success("Portfolio created successfully", {
                            icon: <CheckCircle className="text-green-500" />,
                            className: "glass-success",
                        });
                    }}
                />

                {/* Full-page loading overlay during deletion */}
                {isDeleting && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-slate-700">
                            <div className="flex flex-col items-center space-y-4">
                                <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent"></div>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                        Deleting Portfolio
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Please wait while we delete the portfolio and all associated data. This may take a moment...
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
