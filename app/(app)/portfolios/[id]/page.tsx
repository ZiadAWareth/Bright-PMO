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
import { FormSection, InfoGrid, StatusBadge } from "@/components/ui/form-shell";
import {
  humanize,
  portfolioStatusTone,
  priorityTone,
} from "@/lib/status-tone";
import axios from "axios";
import { set } from "date-fns";
import { AddEntityModal } from "@/components/AddEntityModal";
import { UserWithAccount } from "@/types/user";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ProjectsTab from "@/components/ProjectsTab";
import { Spinner } from "@/components/ui/spinner";
import { TabRow } from "@/components/ui/tab-row";
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
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


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
                return `${baseClasses} bg-success-soft text-success  `;
            case "completed":
                return `${baseClasses} bg-accent-violet-soft text-accent-violet  `;
            case "on_hold":
                return `${baseClasses} bg-warning-soft text-warning  `;
            case "archived":
                return `${baseClasses} bg-surface-2 text-ink-2  `;
            default:
                return `${baseClasses} bg-surface-2 text-ink-2  `;
        }
    };

    const getPriorityBadge = (priority: string) => {
        const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
        switch (priority) {
            case "high":
                return `${baseClasses} bg-danger-soft text-danger  `;
            case "medium":
                return `${baseClasses} bg-warning-soft text-warning  `;
            case "low":
                return `${baseClasses} bg-success-soft text-success  `;
            default:
                return baseClasses;
        }
    };

    const handleEditClick = () => {
        if (!canManagePortfolios()) {
            toast.error("You don't have permission to edit portfolios");
            return;
        }
        router.push(`/portfolios/${portfolioId}/edit`);
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
                                className="text-faint mx-auto mb-4"
                            />
                            <h3 className="text-lg font-medium text-ink mb-2">
                                Access Restricted
                            </h3>
                            <p className="text-muted">
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
                        <Spinner size={48} className="text-bright-primary" />
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
                        <h3 className="text-lg font-medium text-ink mb-2">
                            Project not found
                        </h3>
                        <p className="text-muted mb-4">
                            The project you're looking for doesn't exist or you
                            don't have permission to view it.
                        </p>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    // SPI/CPI are ratios: >1 is ahead, ~1 on plan, <0.9 behind. Rendering them as
    // a percentage of plan keeps the two comparable at a glance.
    const spi = portfolio?.metrics?.average_spi ?? 0;
    const cpi = portfolio?.metrics?.average_cpi ?? 0;
    const ratioTone = (v: number): "success" | "warning" | "danger" =>
      v > 1 ? "success" : v > 0.9 ? "warning" : "danger";

    const portfolioRows: [string, React.ReactNode][] = [
      [
        "Status",
        <StatusBadge
          key="status"
          label={humanize(portfolio?.status)}
          tone={portfolioStatusTone(portfolio?.status)}
        />,
      ],
      [
        "Priority",
        <StatusBadge
          key="priority"
          label={humanize(portfolio?.priority)}
          tone={priorityTone(portfolio?.priority)}
        />,
      ],
      [
        "Manager",
        portfolio?.manager?.account
          ? `${portfolio.manager.account.first_name} ${portfolio.manager.account.last_name}`
          : "—",
      ],
      [
        "Projects",
        <span key="projects" className="tabular-nums">
          {portfolio?.project_count ?? 0}
        </span>,
      ],
    ];

    const performanceRows: [string, React.ReactNode][] = [
      [
        "Average Progress",
        <span key="progress" className="tabular-nums">
          {(portfolio?.avg_progress ?? 0).toFixed(1)}%
        </span>,
      ],
      [
        "Schedule Performance (SPI)",
        <StatusBadge
          key="spi"
          label={`${(spi * 100).toFixed(1)}%`}
          tone={ratioTone(spi)}
        />,
      ],
      [
        "Cost Performance (CPI)",
        <StatusBadge
          key="cpi"
          label={`${(cpi * 100).toFixed(1)}%`}
          tone={ratioTone(cpi)}
        />,
      ],
    ];

    const roleSpecificTabs = getRoleSpecificTabs(activeView);
    const roleSpecificActions = getRoleSpecificActions(activeView);

    return (
        <ProtectedRoute>
            <DashboardLayout
                title={portfolio?.name ?? "Portfolio"}
                subtitle={portfolio?.description}
                backHref="/portfolios"
                backLabel="Back to Portfolios"
                actions={
                    <>
                        <StatusBadge
                            label={humanize(portfolio?.status ?? "")}
                            tone={portfolioStatusTone(portfolio?.status)}
                        />
                        <StatusBadge
                            label={humanize(portfolio?.priority ?? "")}
                            tone={priorityTone(portfolio?.priority)}
                        />
                    </>
                }
                meta={
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="inline-flex items-center gap-1.5">
                            <FolderTree size={14} aria-hidden="true" />
                            {portfolio?.project_count || 0} projects
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Calendar size={14} aria-hidden="true" />
                            Created{" "}
                            {portfolio?.created_at
                                ? new Date(
                                      portfolio.created_at,
                                  ).toLocaleDateString()
                                : "—"}
                        </span>
                        {portfolio?.tags && portfolio.tags.length > 0 && (
                            <span className="flex flex-wrap items-center gap-1.5">
                                {portfolio.tags.map((tag, index) => (
                                    <StatusBadge
                                        key={index}
                                        label={tag}
                                        tone="info"
                                    />
                                ))}
                            </span>
                        )}
                    </div>
                }
                onViewChange={setActiveView}
                activeView={activeView}
            >
                <div className="mb-6">

                    {/* Progress and Key Metrics */}
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex flex-1 min-w-[200px] flex-col bg-surface-2 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-ink-3">
                                    Progress
                                </span>
                                <span className="text-lg font-bold text-ink">
                                    {portfolio?.avg_progress?.toFixed(1)}%
                                </span>
                            </div>
                            <div className="mt-auto w-full bg-surface-3 rounded-full h-2">
                                <div
                                    className="bg-info h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${
                                            portfolio?.avg_progress || 0
                                        }%`,
                                    }}
                                ></div>
                            </div>
                        </div>

                        <div className="flex flex-1 min-w-[200px] flex-col bg-surface-2 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-ink-3">
                                    Budget
                                </span>
                                <span className="text-lg font-bold text-ink">
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
                            <div className="text-xs text-muted mb-1">
                                {formatCurrency(
                                    portfolio?.total_actual_cost || 0
                                )}{" "}
                                / {formatCurrency(portfolio?.total_budget || 0)}
                            </div>
                            <div className="mt-auto w-full bg-surface-3 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        portfolio?.total_actual_cost &&
                                        portfolio?.total_budget
                                            ? (portfolio.total_actual_cost /
                                                  portfolio.total_budget) *
                                                  100 >
                                              90
                                                ? "bg-danger"
                                                : (portfolio.total_actual_cost /
                                                      portfolio.total_budget) *
                                                      100 >
                                                  75
                                                ? "bg-warning"
                                                : "bg-success"
                                            : "bg-success"
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

                        <div className="flex flex-1 min-w-[200px] flex-col bg-surface-2 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-ink-3">
                                    SPI
                                </span>
                                <span className="text-lg font-bold text-ink">
                                    {portfolio?.metrics?.average_spi
                                        ? (
                                              portfolio.metrics.average_spi *
                                              100
                                          ).toFixed(1)
                                        : 0}
                                    %
                                </span>
                            </div>
                            <div className="mt-auto w-full bg-surface-3 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        portfolio?.metrics?.average_spi
                                            ? portfolio.metrics.average_spi > 1
                                                ? "bg-success"
                                                : portfolio.metrics
                                                      .average_spi > 0.9
                                                ? "bg-warning"
                                                : "bg-danger"
                                            : "bg-muted"
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

                        <div className="flex flex-1 min-w-[200px] flex-col bg-surface-2 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-ink-3">
                                    CPI
                                </span>
                                <span className="text-lg font-bold text-ink">
                                    {portfolio?.metrics?.average_cpi
                                        ? (
                                              portfolio.metrics.average_cpi *
                                              100
                                          ).toFixed(1)
                                        : 0}
                                    %
                                </span>
                            </div>
                            <div className="mt-auto w-full bg-surface-3 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        portfolio?.metrics?.average_cpi
                                            ? portfolio.metrics.average_cpi > 1
                                                ? "bg-success"
                                                : portfolio.metrics
                                                      .average_cpi > 0.9
                                                ? "bg-warning"
                                                : "bg-danger"
                                            : "bg-muted"
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

                        <div className="flex flex-1 min-w-[200px] flex-col bg-surface-2 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-ink-3">
                                    Health Index
                                </span>
                                <span className="text-lg font-bold text-ink">
                                    {portfolio?.metrics?.health_index || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-muted">
                                    {portfolio?.metrics?.health_status ||
                                        "Unknown"}
                                </span>
                                <div
                                    className={`w-3 h-3 rounded-full ${
                                        portfolio?.metrics?.health_index >= 80
                                            ? "bg-success"
                                            : portfolio?.metrics
                                                  ?.health_index >= 70
                                            ? "bg-info"
                                            : portfolio?.metrics
                                                  ?.health_index >= 60
                                            ? "bg-warning"
                                            : portfolio?.metrics
                                                  ?.health_index >= 50
                                            ? "bg-bright"
                                            : "bg-danger"
                                    }`}
                                ></div>
                            </div>
                            <div className="mt-auto w-full bg-surface-3 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        portfolio?.metrics?.health_index >= 80
                                            ? "bg-success"
                                            : portfolio?.metrics
                                                  ?.health_index >= 70
                                            ? "bg-info"
                                            : portfolio?.metrics
                                                  ?.health_index >= 60
                                            ? "bg-warning"
                                            : portfolio?.metrics
                                                  ?.health_index >= 50
                                            ? "bg-bright"
                                            : "bg-danger"
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
                    <div className="flex items-center justify-between pt-4 border-t border-line">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted">
                                Managed by{" "}
                                <span className="font-medium text-ink">
                                    {`${portfolio?.manager?.account?.first_name} ${portfolio?.manager?.account?.last_name}`}
                                </span>
                            </span>
                            {activeView === "admin" && (
                                <span className="text-sm text-muted">
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
                                            ? "bg-bright text-white hover:bg-bright-deep"
                                            : action.variant === "danger"
                                            ? "bg-danger text-white hover:opacity-90"
                                            : "border border-line text-ink-3 hover:bg-surface-2"
                                    }`}
                                >
                                    {action.icon}
                                    <span>{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <TabRow
                    tabs={roleSpecificTabs}
                    value={activeTab}
                    onChange={(id) => {
                        if (id === "wbs") {
                            router.push(`/projects/${portfolioId}/wbs`);
                        } else if (id === "gantt") {
                            router.push(`/projects/${portfolioId}/gantt`);
                        } else {
                            setActiveTab(id);
                        }
                    }}
                />

                {/* Tab Content */}
                <div className="mt-6">
                    {activeTab === "overview" && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Portfolio Information */}
                            <div className="lg:col-span-2 space-y-6">
                                <FormSection title="Portfolio Information">
                                    <InfoGrid rows={portfolioRows} />

                                    {portfolio?.description && (
                                        <div className="mt-5 border-t border-line-2 pt-4">
                                            <div className="mb-1 text-[13px] text-muted">
                                                Description
                                            </div>
                                            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-[13.5px] text-ink">
                                                {portfolio.description}
                                            </p>
                                        </div>
                                    )}

                                    {portfolio?.strategic_objective && (
                                        <div className="mt-5 border-t border-line-2 pt-4">
                                            <div className="mb-1 text-[13px] text-muted">
                                                Strategic Objective
                                            </div>
                                            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-[13.5px] text-ink">
                                                {portfolio.strategic_objective}
                                            </p>
                                        </div>
                                    )}

                                    {portfolio?.tags && portfolio.tags.length > 0 && (
                                        <div className="mt-5 border-t border-line-2 pt-4">
                                            <div className="mb-2 text-[13px] text-muted">
                                                Tags
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {portfolio.tags.map((tag, index) => (
                                                    <StatusBadge
                                                        key={index}
                                                        label={tag}
                                                        tone="info"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </FormSection>

                                {/* Underperforming Projects Alert */}
                                {portfolio?.metrics?.underperforming_projects &&
                                    portfolio.metrics.underperforming_projects
                                        .length > 0 && (
                                        <div className="bg-danger-soft border border-danger rounded-xl p-6">
                                            <div className="flex items-center mb-4">
                                                <AlertTriangle className="w-5 h-5 text-danger mr-2" />
                                                <h3 className="text-lg font-semibold text-danger">
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
                                                                className="flex items-center justify-between p-3 bg-surface border border-danger rounded-lg"
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-3 h-3 rounded-full bg-danger"></div>
                                                                        <div>
                                                                            <p className="font-medium text-ink">
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
                                                                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-soft text-danger"
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
                                                                <div className="flex items-center space-x-4 text-sm text-muted">
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
                                                                        className="text-danger hover:text-danger font-medium"
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
                                <FormSection title="Performance">
                                    <div className="[&_dl]:sm:grid-cols-1">
                                        <InfoGrid rows={performanceRows} />
                                    </div>
                                </FormSection>

                                {/* Project Count Card */}
                                <div className="bg-surface border border-line rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-ink">
                                            Projects
                                        </h3>
                                        <span className="text-2xl font-bold text-ink">
                                            {portfolio?.project_count || 0}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {portfolio?.projects
                                            ?.slice(0, 5)
                                            .map((project) => (
                                                <div
                                                    key={project.project_id}
                                                    className="flex items-center space-x-3 p-3 bg-surface-2 rounded-lg"
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-success"></div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-ink">
                                                            {project.name}
                                                        </p>
                                                        <p className="text-xs text-muted">
                                                            {project.status}
                                                        </p>
                                                    </div>
                                                    <span className="text-sm text-muted">
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
                                            className="w-full text-sm text-bright hover:text-bright-deep py-2"
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
                                className="rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto glass-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hasActiveProjects ? 'bg-danger-soft' : 'bg-danger-soft'}`}>
                                            <AlertTriangle className={`w-6 h-6 ${hasActiveProjects ? 'text-danger' : 'text-danger'}`} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-ink">
                                                {hasActiveProjects ? 'Cannot Delete Portfolio' : 'Delete Portfolio'}
                                    </h3>
                                    <p className="text-sm text-muted">
                                                {hasActiveProjects ? 'Active projects must be completed first' : 'This action cannot be undone'}
                                    </p>
                                </div>
                            </div>
                                    <button
                                        onClick={() => setShowDeleteConfirmation(false)}
                                        className="text-faint hover:text-bright"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {hasActiveProjects ? (
                                    <div className="space-y-4">
                                        <div className="bg-danger-soft border border-danger rounded-lg p-4">
                                            <p className="text-danger font-medium mb-2">
                                                ⚠️ This portfolio cannot be deleted because it contains active projects.
                                            </p>
                                            <p className="text-sm text-danger">
                                                Please complete or close all active projects before deleting this portfolio.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-ink-3 mb-3">
                                                Portfolio <span className="font-semibold">"{portfolio.name}"</span> contains:
                                            </p>
                                            <div className="space-y-2">
                                                <div className="bg-surface-2 rounded-lg p-3">
                                                    <p className="text-sm font-medium text-ink mb-2">
                                                        Active Projects ({activeProjects.length}):
                                                    </p>
                                                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                                                        {activeProjects.map((project: any) => (
                                                            <li key={project.project_id} className="text-sm text-ink-3 flex items-start">
                                                                <span className="w-2 h-2 bg-danger rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                                                <span className="flex-1">
                                                                    <span className="font-medium">{project.name || `Project #${project.project_id}`}</span>
                                                                    <span className="text-xs text-muted ml-2 capitalize">({project.status.replace('_', ' ')})</span>
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                {completedProjects.length > 0 && (
                                                    <div className="bg-surface-2 rounded-lg p-3">
                                                        <p className="text-sm font-medium text-ink mb-2">
                                                            Completed/Closed Projects ({completedProjects.length}):
                                                        </p>
                                                        <ul className="space-y-1 max-h-24 overflow-y-auto">
                                                            {completedProjects.map((project: any) => (
                                                                <li key={project.project_id} className="text-sm text-muted flex items-start">
                                                                    <span className="w-2 h-2 bg-success rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
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
                                        <p className="text-ink-3">
                                Are you sure you want to delete{" "}
                                            <strong>"{portfolio.name}"</strong>? This action cannot be undone.
                                        </p>
                                        {projects.length > 0 && (
                                            <div className="bg-warning-soft border border-warning rounded-lg p-4">
                                                <p className="text-warning font-medium mb-2">
                                                    ⚠️ Warning: This will permanently delete {projects.length} project(s):
                                                </p>
                                                <ul className="space-y-1 max-h-32 overflow-y-auto">
                                                    {projects.slice(0, 10).map((project: any) => (
                                                        <li key={project.project_id} className="text-sm text-warning flex items-start">
                                                            <span className="w-2 h-2 bg-warning rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                                                            <span className="flex-1">
                                                                <span className="font-medium">{project.name || `Project #${project.project_id}`}</span>
                                                                <span className="text-xs text-warning ml-2 capitalize">({project.status.replace('_', ' ')})</span>
                                                            </span>
                                                        </li>
                                                    ))}
                                                    {projects.length > 10 && (
                                                        <li className="text-sm text-warning italic">
                                                            ... and {projects.length - 10} more project(s)
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                        <p className="text-sm text-muted">
                                            All associated data including projects, tasks, budgets, and documents will be permanently removed.
                                        </p>
                                    </div>
                                )}

                                <div className="flex justify-end space-x-3 mt-6">
                                <button
                                        onClick={() => setShowDeleteConfirmation(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                                >
                                        {hasActiveProjects ? 'Close' : 'Cancel'}
                                </button>
                                    {!hasActiveProjects && (
                                <button
                                    onClick={handleDeletePortfolio}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-danger text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {isDeleting && (
                                        <Spinner size={16} />
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
                        <div className="bg-surface rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-line">
                            <div className="flex flex-col items-center space-y-4">
                                <Spinner size={56} className="text-bright-primary" />
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-ink mb-2">
                                        Deleting Portfolio
                                    </h3>
                                    <p className="text-sm text-muted">
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
