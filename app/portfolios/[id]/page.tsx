"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    ArrowLeft,
    Edit,
    Star,
    Share2,
    MoreHorizontal,
    Users,
    Calendar,
    DollarSign,
    AlertTriangle,
    FileText,
    BarChart3,
    Target,
    Shield,
    CheckCircle,
    Clock,
    TrendingUp,
    Settings,
    Archive,
    Trash2,
    UserPlus,
    Upload,
    Download,
    MessageSquare,
    Bell,
    Eye,
    Lock,
    Unlock,
    RefreshCw,
    PlusCircle,
    MinusCircle,
    ExternalLink,
    MapPin,
    Building,
    Activity,
    FolderTree,
    Plus,
    X,
} from "lucide-react";
import { ProjectWithRelations } from "@/types/project";
import { PortfolioWithRelations } from "@/types/portfolio";
import axios from "axios";
import { set } from "date-fns";
import { AddEntityModal } from "@/components/AddEntityModal";
import { UserWithAccount } from "@/types/user";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import EditPortfolioModal from "@/components/portfolio/EditPortfolioModal";
import ProjectsTab from "@/components/ProjectsTab";
// import ProjectsTab from '@/components/portfolio/ProjectsTab';

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

interface Document {
    id: number;
    name: string;
    type: string;
    size: string;
    uploadedBy: string;
    uploadedDate: string;
    category: string;
    version: string;
    status: "draft" | "review" | "approved" | "archived";
    url: string;
}

interface Comment {
    id: number;
    author: string;
    content: string;
    timestamp: string;
    type: "general" | "task" | "risk" | "milestone";
    relatedId?: number;
    mentions: string[];
}

interface AuditLog {
    id: number;
    action: string;
    user: string;
    timestamp: string;
    details: string;
    entityType: string;
    entityId: number;
    oldValue?: string;
    newValue?: string;
}

interface Integration {
    id: number;
    name: string;
    type: string;
    status: "connected" | "disconnected" | "error" | "syncing";
    lastSync: string;
    description: string;
}

const ProjectDetailsPage = ({
    params,
}: {
    params: Promise<{ id: string }>;
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<User | null>(null);
    const [activeView, setActiveView] = useState("admin");
    const [activeTab, setActiveTab] = useState("overview");
    const [portfolioId, setPortfolioId] = useState<string>("");
    const [portfolio, setPortfolio] = useState<PortfolioWithRelations | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Check if we're in dark mode
    const isDarkMode =
        typeof window !== "undefined" &&
        document.documentElement.classList.contains("dark");

    // Permission checking functions
    const canViewPortfolios = () => {
        const roleName = user?.role?.role_name || user?.role?.name;
        return (
            roleName && ["PMO", "PJM", "ADMIN", "IT", "DIR"].includes(roleName)
        );
    };

    const canManagePortfolios = () => {
        const roleName = user?.role?.role_name || user?.role?.name;
        return roleName && ["PMO", "PJM", "ADMIN", "DIR"].includes(roleName);
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
        const getParams = async () => {
            const resolvedParams = await params;
            setPortfolioId(resolvedParams.id);
        };
        getParams();
        fetchUserData();
    }, [params]);

    useEffect(() => {
        if (!portfolioId) return;

        setLoading(true);
        axios
            .get(`/api/portfolios/${portfolioId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            })
            .then((res) => {
                console.log("Portfolio data fetched:", res.data);
                setPortfolio(res.data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching portfolio data:", err);
                setLoading(false);
            });
    }, [portfolioId]);

    // Get role-specific tabs
    const getRoleSpecificTabs = (role: string) => {
        return [
            {
                id: "overview",
                label: "Overview",
                icon: <BarChart3 size={16} />,
            },
            {
                id: "projects",
                label: "Projects",
                icon: <FolderTree size={16} />,
            },
        ];
    };

    // Get role-specific actions
    const getRoleSpecificActions = (role: string) => {
        // Only show actions if user has management permissions
        if (!canManagePortfolios()) {
            return [];
        }

        switch (role) {
            case "admin":
                return [
                    {
                        label: "Edit Portfolio",
                        icon: <Edit size={16} />,
                        action: "edit",
                        variant: "primary",
                    },
                    {
                        label: "Delete",
                        icon: <Trash2 size={16} />,
                        action: "delete",
                        variant: "danger",
                    },
                ];
            case "project-manager":
                return [
                    {
                        label: "Edit Portfolio",
                        icon: <Edit size={16} />,
                        action: "edit",
                        variant: "primary",
                    },
                    {
                        label: "Generate Report",
                        icon: <Download size={16} />,
                        action: "generate_report",
                        variant: "secondary",
                    },
                ];
            case "team-member":
                return [
                    {
                        label: "Generate Report",
                        icon: <Download size={16} />,
                        action: "generate_report",
                        variant: "secondary",
                    },
                ];
            default:
                return [];
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "OMR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "px-3 py-1 rounded-md text-xs font-medium";
        switch (status) {
            case "active":
                return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
            case "completed":
                return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300`;
            case "on_hold":
                return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
            case "archived":
                return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
        }
    };

    const getPriorityBadge = (priority: string) => {
        const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
        switch (priority) {
            case "high":
                return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
            case "medium":
                return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
            case "low":
                return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
            default:
                return baseClasses;
        }
    };

    const handleEditSuccess = () => {
        setShowEditModal(false);
        // Refresh portfolio data after successful edit
        if (portfolioId) {
            axios
                .get(`/api/portfolios/${portfolioId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                })
                .then((res) => {
                    setPortfolio(res.data);
                    toast.success("Portfolio updated successfully");
                })
                .catch((err) => {
                    console.error("Error refreshing portfolio data:", err);
                    toast.error("Failed to refresh portfolio data");
                });
        }
    };

    const handleEditClick = () => {
        if (!canManagePortfolios()) {
            toast.error("You don't have permission to edit portfolios");
            return;
        }
        setShowEditModal(true);
    };

    const handleDeleteClick = () => {
        if (!canManagePortfolios()) {
            toast.error("You don't have permission to delete portfolios");
            return;
        }
        setShowDeleteConfirmation(true);
    };

    const handleGenerateReport = () => {
        // TODO: Implement report generation
        toast.info("Report generation coming soon!");
    };

    const handleDeletePortfolio = async () => {
        if (!portfolioId) return;

        setIsDeleting(true);
        try {
            await axios.delete(`/api/portfolios/${portfolioId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
            });

            toast.success("Portfolio deleted successfully");
            router.push("/portfolios");
        } catch (error: any) {
            console.error("Error deleting portfolio:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to delete portfolio";
            
            if (error.response?.status === 403 && error.response?.data?.activeProjects) {
                // Show detailed error about active projects
                const activeProjects = error.response.data.activeProjects;
                const projectList = activeProjects.map((p: any) => p.name).join(", ");
                toast.error(
                    `Cannot delete portfolio: ${activeProjects.length} active project(s) must be completed first. Projects: ${projectList}`,
                    {
                        duration: 8000,
                    }
                );
            } else {
            toast.error(errorMessage);
            }
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirmation(false);
        }
    };

    // Check if user has permission to view portfolios
    if (user && !canViewPortfolios()) {
        return (
            <ProtectedRoute>
                <DashboardLayout
                    onViewChange={setActiveView}
                    activeView={activeView}
                >
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
                                You don't have permission to view this
                                portfolio.
                            </p>
                        </div>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    if (loading) {
        return (
            <ProtectedRoute>
                <DashboardLayout
                    onViewChange={setActiveView}
                    activeView={activeView}
                >
                    <div className="flex items-center justify-center min-h-96">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    if (!portfolio) {
        return (
            <ProtectedRoute>
                <DashboardLayout
                    onViewChange={setActiveView}
                    activeView={activeView}
                >
                    <div className="text-center py-12">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Project not found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            The project you're looking for doesn't exist or you
                            don't have permission to view it.
                        </p>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    const roleSpecificTabs = getRoleSpecificTabs(activeView);
    const roleSpecificActions = getRoleSpecificActions(activeView);

    return (
        <ProtectedRoute>
            <DashboardLayout
                onViewChange={setActiveView}
                activeView={activeView}
            >
                {/* Breadcrumb Navigation */}
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                    <button
                        onClick={() => router.push("/portfolios")}
                        className="hover:text-orange-600 transition-colors"
                    >
                        Portfolios
                    </button>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-gray-100">
                        {portfolio?.name || "Loading..."}
                    </span>
                </div>

                {/* Project Header */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                                <button
                                    onClick={() => router.back()}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {portfolio?.name}
                                </h1>
                                <span
                                    className={getStatusBadge(
                                        portfolio?.status || ""
                                    )}
                                >
                                    {portfolio?.status
                                        ?.replace("_", " ")
                                        .toUpperCase()}
                                </span>
                                <span
                                    className={getPriorityBadge(
                                        portfolio?.priority || ""
                                    )}
                                >
                                    {portfolio?.priority?.toUpperCase()}
                                </span>
                            </div>
                            <div className="max-h-32 overflow-y-auto mb-3">
                                <p className="text-gray-600 dark:text-gray-400 break-words whitespace-pre-wrap">
                                {portfolio?.description}
                            </p>
                            </div>
                            {portfolio?.tags && portfolio.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {portfolio.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center space-x-6 text-sm text-gray-500">
                                <span className="flex items-center">
                                    <FolderTree size={14} className="mr-1" />
                                    {portfolio?.project_count || 0} Projects
                                </span>
                                <span className="flex items-center">
                                    <Calendar size={14} className="mr-1" />
                                    Created{" "}
                                    {portfolio?.created_at
                                        ? new Date(
                                              portfolio.created_at
                                          ).toLocaleDateString()
                                        : ""}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress and Key Metrics */}
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex-1 min-w-[200px] bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Progress
                                </span>
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {portfolio?.avg_progress?.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${
                                            portfolio?.avg_progress || 0
                                        }%`,
                                    }}
                                ></div>
                            </div>
                        </div>

                        <div className="flex-1 min-w-[200px] bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Budget
                                </span>
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {portfolio?.total_actual_cost &&
                                    portfolio?.total_budget
                                        ? (
                                              (portfolio.total_actual_cost /
                                                  portfolio.total_budget) *
                                              100
                                          ).toFixed(1)
                                        : 0}
                                    %
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 mb-1">
                                {formatCurrency(
                                    portfolio?.total_actual_cost || 0
                                )}{" "}
                                / {formatCurrency(portfolio?.total_budget || 0)}
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        portfolio?.total_actual_cost &&
                                        portfolio?.total_budget
                                            ? (portfolio.total_actual_cost /
                                                  portfolio.total_budget) *
                                                  100 >
                                              90
                                                ? "bg-red-500"
                                                : (portfolio.total_actual_cost /
                                                      portfolio.total_budget) *
                                                      100 >
                                                  75
                                                ? "bg-yellow-500"
                                                : "bg-green-500"
                                            : "bg-green-500"
                                    }`}
                                    style={{
                                        width: `${Math.min(
                                            portfolio?.total_actual_cost &&
                                                portfolio?.total_budget
                                                ? (portfolio.total_actual_cost /
                                                      portfolio.total_budget) *
                                                      100
                                                : 0,
                                            100
                                        )}%`,
                                    }}
                                ></div>
                            </div>
                        </div>

                        <div className="flex-1 min-w-[200px] bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    SPI
                                </span>
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {portfolio?.metrics?.average_spi
                                        ? (
                                              portfolio.metrics.average_spi *
                                              100
                                          ).toFixed(1)
                                        : 0}
                                    %
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        portfolio?.metrics?.average_spi
                                            ? portfolio.metrics.average_spi > 1
                                                ? "bg-green-500"
                                                : portfolio.metrics
                                                      .average_spi > 0.9
                                                ? "bg-yellow-500"
                                                : "bg-red-500"
                                            : "bg-gray-500"
                                    }`}
                                    style={{
                                        width: `${Math.min(
                                            (portfolio?.metrics?.average_spi ||
                                                0) * 100,
                                            100
                                        )}%`,
                                    }}
                                ></div>
                            </div>
                        </div>

                        <div className="flex-1 min-w-[200px] bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    CPI
                                </span>
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {portfolio?.metrics?.average_cpi
                                        ? (
                                              portfolio.metrics.average_cpi *
                                              100
                                          ).toFixed(1)
                                        : 0}
                                    %
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        portfolio?.metrics?.average_cpi
                                            ? portfolio.metrics.average_cpi > 1
                                                ? "bg-green-500"
                                                : portfolio.metrics
                                                      .average_cpi > 0.9
                                                ? "bg-yellow-500"
                                                : "bg-red-500"
                                            : "bg-gray-500"
                                    }`}
                                    style={{
                                        width: `${Math.min(
                                            (portfolio?.metrics?.average_cpi ||
                                                0) * 100,
                                            100
                                        )}%`,
                                    }}
                                ></div>
                            </div>
                        </div>

                        <div className="flex-1 min-w-[200px] bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Health Index
                                </span>
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {portfolio?.metrics?.health_index || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {portfolio?.metrics?.health_status ||
                                        "Unknown"}
                                </span>
                                <div
                                    className={`w-3 h-3 rounded-full ${
                                        portfolio?.metrics?.health_index >= 80
                                            ? "bg-green-500"
                                            : portfolio?.metrics
                                                  ?.health_index >= 70
                                            ? "bg-blue-500"
                                            : portfolio?.metrics
                                                  ?.health_index >= 60
                                            ? "bg-yellow-500"
                                            : portfolio?.metrics
                                                  ?.health_index >= 50
                                            ? "bg-orange-500"
                                            : "bg-red-500"
                                    }`}
                                ></div>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        portfolio?.metrics?.health_index >= 80
                                            ? "bg-green-500"
                                            : portfolio?.metrics
                                                  ?.health_index >= 70
                                            ? "bg-blue-500"
                                            : portfolio?.metrics
                                                  ?.health_index >= 60
                                            ? "bg-yellow-500"
                                            : portfolio?.metrics
                                                  ?.health_index >= 50
                                            ? "bg-orange-500"
                                            : "bg-red-500"
                                    }`}
                                    style={{
                                        width: `${Math.min(
                                            portfolio?.metrics?.health_index ||
                                                0,
                                            100
                                        )}%`,
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">
                                Managed by{" "}
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {`${portfolio?.manager?.account?.first_name} ${portfolio?.manager?.account?.last_name}`}
                                </span>
                            </span>
                            {activeView === "admin" && (
                                <span className="text-sm text-gray-500">
                                    Created on{" "}
                                    {portfolio?.created_at
                                        ? new Date(
                                              portfolio.created_at
                                          ).toLocaleDateString()
                                        : ""}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            {roleSpecificActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        if (action.action === "edit")
                                            handleEditClick();
                                        else if (action.action === "delete")
                                            handleDeleteClick();
                                        else if (
                                            action.action === "generate_report"
                                        )
                                            handleGenerateReport();
                                    }}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                                        action.variant === "primary"
                                            ? "bg-orange-600 text-white hover:bg-orange-700"
                                            : action.variant === "danger"
                                            ? "bg-red-600 text-white hover:bg-red-700"
                                            : "border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                    }`}
                                >
                                    {action.icon}
                                    <span>{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl mb-6">
                    <div className="flex items-center space-x-1 p-1 overflow-x-auto whitespace-nowrap">
                        {roleSpecificTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (tab.id === "wbs") {
                                        router.push(
                                            `/projects/${portfolioId}/wbs`
                                        );
                                    } else if (tab.id === "gantt") {
                                        router.push(
                                            `/projects/${portfolioId}/gantt`
                                        );
                                    } else {
                                        setActiveTab(tab.id);
                                    }
                                }}
                                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                    activeTab === tab.id
                                        ? "bg-orange-600 text-white"
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
                <div className="mt-6">
                    {activeTab === "overview" && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Portfolio Information */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Portfolio Details */}
                                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                        Portfolio Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Status
                                            </label>
                                            <p className="text-sm text-gray-900 dark:text-gray-100">
                                                {portfolio?.status}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Priority
                                            </label>
                                            <p className="text-sm text-gray-900 dark:text-gray-100">
                                                {portfolio?.priority}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Manager
                                            </label>
                                            <p className="text-sm text-gray-900 dark:text-gray-100">
                                                {`${portfolio?.manager?.account?.first_name} ${portfolio?.manager?.account?.last_name}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Description
                                        </label>
                                        <div className="max-h-48 overflow-y-auto">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 break-words whitespace-pre-wrap">
                                            {portfolio?.description}
                                        </p>
                                        </div>
                                    </div>
                                    {portfolio?.strategic_objective && (
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Strategic Objective
                                            </label>
                                            <div className="max-h-48 overflow-y-auto">
                                                <p className="text-sm text-gray-600 dark:text-gray-400 break-words whitespace-pre-wrap">
                                                {portfolio.strategic_objective}
                                            </p>
                                            </div>
                                        </div>
                                    )}
                                    {portfolio?.tags && portfolio.tags.length > 0 && (
                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Tags
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {portfolio.tags.map((tag, index) => (
                                                    <span
                                                        key={index}
                                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Underperforming Projects Alert */}
                                {portfolio?.metrics?.underperforming_projects &&
                                    portfolio.metrics.underperforming_projects
                                        .length > 0 && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                                            <div className="flex items-center mb-4">
                                                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                                                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                                                    Underperforming Projects (
                                                    {
                                                        portfolio.metrics
                                                            .underperforming_projects
                                                            .length
                                                    }
                                                    )
                                                </h3>
                                            </div>
                                            <div className="space-y-3">
                                                {portfolio.metrics.underperforming_projects.map(
                                                    (item) => {
                                                        const project =
                                                            portfolio.projects.find(
                                                                (p) =>
                                                                    p.project_id ===
                                                                    item.project_id
                                                            );
                                                        return project ? (
                                                            <div
                                                                key={
                                                                    item.project_id
                                                                }
                                                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 rounded-lg"
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                                        <div>
                                                                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                                {
                                                                                    project.name
                                                                                }
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                                {item.reasons.map(
                                                                                    (
                                                                                        reason,
                                                                                        idx
                                                                                    ) => (
                                                                                        <span
                                                                                            key={
                                                                                                idx
                                                                                            }
                                                                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                                                        >
                                                                                            {
                                                                                                reason
                                                                                            }
                                                                                        </span>
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                                    <span>
                                                                        {
                                                                            project.progress_percentage
                                                                        }
                                                                        %
                                                                        complete
                                                                    </span>
                                                                    <button
                                                                        onClick={() =>
                                                                            router.push(
                                                                                `/projects/${project.project_id}`
                                                                            )
                                                                        }
                                                                        className="text-red-600 hover:text-red-700 font-medium"
                                                                    >
                                                                        View
                                                                        Project
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    }
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Quick Stats */}
                                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                        Quick Stats
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Average Progress
                                            </span>
                                            <span className="text-sm font-medium text-orange-600">
                                                {portfolio?.avg_progress?.toFixed(
                                                    1
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Schedule Performance (SPI)
                                            </span>
                                            <span
                                                className={`text-sm font-medium ${
                                                    (portfolio?.metrics
                                                        ?.average_spi ?? 0) > 1
                                                        ? "text-green-600"
                                                        : (portfolio?.metrics
                                                              ?.average_spi ??
                                                              0) > 0.9
                                                        ? "text-yellow-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                {(
                                                    (portfolio?.metrics
                                                        ?.average_spi ?? 0) *
                                                    100
                                                ).toFixed(1)}
                                                %
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Cost Performance (CPI)
                                            </span>
                                            <span
                                                className={`text-sm font-medium ${
                                                    (portfolio?.metrics
                                                        ?.average_cpi ?? 0) > 1
                                                        ? "text-green-600"
                                                        : (portfolio?.metrics
                                                              ?.average_cpi ??
                                                              0) > 0.9
                                                        ? "text-yellow-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                {(
                                                    (portfolio?.metrics
                                                        ?.average_cpi ?? 0) *
                                                    100
                                                ).toFixed(1)}
                                                %
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Project Count Card */}
                                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            Projects
                                        </h3>
                                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                            {portfolio?.project_count || 0}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {portfolio?.projects
                                            ?.slice(0, 5)
                                            .map((project) => (
                                                <div
                                                    key={project.project_id}
                                                    className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {project.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {project.status}
                                                        </p>
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {
                                                            project.progress_percentage
                                                        }
                                                        %
                                                    </span>
                                                </div>
                                            ))}
                                        <button
                                            onClick={() =>
                                                setActiveTab("projects")
                                            }
                                            className="w-full text-sm text-orange-600 hover:text-orange-700 py-2"
                                        >
                                            View all projects
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "projects" && portfolio !== null && (
                        <ProjectsTab
                            projects={portfolio.projects}
                            activeView={activeView}
                            projectCount={portfolio.projects.length}
                        />
                    )}
                </div>

                {/* Edit Portfolio Modal */}
                <EditPortfolioModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    portfolio={portfolio}
                    onSuccess={handleEditSuccess}
                />

                {/* Delete Confirmation Modal */}
                {showDeleteConfirmation && portfolio && (() => {
                    const activeProjectStatuses = ['planning', 'execution', 'pending_approval', 'approved', 'on_hold'];
                    const projects = portfolio.projects || [];
                    const activeProjects = projects.filter((p: any) => activeProjectStatuses.includes(p.status));
                    const completedProjects = projects.filter((p: any) => ['completed', 'closed'].includes(p.status));
                    const hasActiveProjects = activeProjects.length > 0;
                    
                    return (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                        }}
                        onClick={() => setShowDeleteConfirmation(false)}
                    >
                        <div
                                className="rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
                            style={{
                                backgroundColor: isDarkMode
                                    ? "rgba(30, 41, 59, 0.95)"
                                    : "rgba(255, 255, 255, 0.95)",
                                backdropFilter: "blur(20px)",
                                WebkitBackdropFilter: "blur(20px)",
                                border: isDarkMode
                                    ? "1px solid rgba(148, 163, 184, 0.2)"
                                    : "1px solid rgba(255, 255, 255, 0.2)",
                                boxShadow:
                                    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hasActiveProjects ? 'bg-red-100 dark:bg-red-900' : 'bg-red-100 dark:bg-red-900'}`}>
                                            <AlertTriangle className={`w-6 h-6 ${hasActiveProjects ? 'text-red-600' : 'text-red-600'}`} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {hasActiveProjects ? 'Cannot Delete Portfolio' : 'Delete Portfolio'}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {hasActiveProjects ? 'Active projects must be completed first' : 'This action cannot be undone'}
                                    </p>
                                </div>
                            </div>
                                    <button
                                        onClick={() => setShowDeleteConfirmation(false)}
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
                                                Portfolio <span className="font-semibold">"{portfolio.name}"</span> contains:
                                            </p>
                                            <div className="space-y-2">
                                                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                                                        Active Projects ({activeProjects.length}):
                                                    </p>
                                                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                                                        {activeProjects.map((project: any) => (
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
                                                            {completedProjects.map((project: any) => (
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
                                        <p className="text-gray-700 dark:text-gray-300">
                                Are you sure you want to delete{" "}
                                            <strong>"{portfolio.name}"</strong>? This action cannot be undone.
                                        </p>
                                        {projects.length > 0 && (
                                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                                <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                                                    ⚠️ Warning: This will permanently delete {projects.length} project(s):
                                                </p>
                                                <ul className="space-y-1 max-h-32 overflow-y-auto">
                                                    {projects.slice(0, 10).map((project: any) => (
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
                                        onClick={() => setShowDeleteConfirmation(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                        {hasActiveProjects ? 'Close' : 'Cancel'}
                                </button>
                                    {!hasActiveProjects && (
                                <button
                                    onClick={handleDeletePortfolio}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {isDeleting && (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    )}
                                    <span>
                                        {isDeleting
                                            ? "Deleting..."
                                            : "Delete Portfolio"}
                                    </span>
                                </button>
                                    )}
                            </div>
                        </div>
                    </div>
                    );
                })()}

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
};

export default ProjectDetailsPage;
