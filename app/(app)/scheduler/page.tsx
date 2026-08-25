"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
    Plus,
    Calendar,
    Clock,
    Users,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Edit,
    Trash2,
    Eye,
    Search,
    Filter,
    Download,
    Settings,
    BarChart3,
    TrendingUp,
    DollarSign,
    MoreHorizontal,
    X,
    Grid,
    List,
    Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import axios from "@/lib/axios";
import EditScheduleModal from "@/components/EditScheduleModal";

interface Schedule {
    schedule_id: number;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status:
        | "draft"
        | "analyzing"
        | "feasible"
        | "infeasible"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "converted";
    priority: "low" | "medium" | "high";
    feasibility_score: number;
    total_tasks: number;
    total_resources: number;
    budget_amount: number;
    created_at: string;
    updated_at: string;
}

interface User {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: {
        role_id: number;
        name: string;
        role_name: string;
    };
}

const SchedulerPage = () => {
    const router = useRouter();
    const [activeView, setActiveView] = useState("admin");
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showFilters, setShowFilters] = useState(false);
    const [selectedSchedules, setSelectedSchedules] = useState<number[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(
        null
    );
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [scheduleToEdit, setScheduleToEdit] = useState<number | null>(null);
    const [user, setUser] = useState<User | null>(null);

    // Check if user has permission to manage schedules
    const canManageSchedules = () => {
        if (!user || !user.role) return false;
        const allowedRoles = ["PMO", "PJM", "ADMIN", "DIR"];
        return allowedRoles.includes(user.role.name);
    };

    useEffect(() => {
        fetchUser();
        fetchSchedules();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [schedules, searchQuery, statusFilter, priorityFilter]);

    const fetchUser = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/auth/login");
                return;
            }

            const response = await axios.get("/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
            });

            setUser(response.data.user);
        } catch (error) {
            console.error("Failed to fetch user:", error);
            router.push("/auth/login");
        }
    };

    const fetchSchedules = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/auth/login");
                return;
            }

            const response = await axios.get("/api/schedules", {
                headers: { Authorization: `Bearer ${token}` },
            });

            setSchedules(response.data.schedules || []);
        } catch (error) {
            console.error("Failed to fetch schedules:", error);
            toast.error("Failed to load schedules");
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = schedules.filter((schedule) => {
            const matchesSearch =
                schedule.name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                schedule.description
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());
            const matchesStatus =
                statusFilter === "all" || schedule.status === statusFilter;
            const matchesPriority =
                priorityFilter === "all" ||
                schedule.priority === priorityFilter;

            return matchesSearch && matchesStatus && matchesPriority;
        });

        setFilteredSchedules(filtered);
    };

    const handleDeleteClick = (schedule: Schedule) => {
        if (!canManageSchedules()) {
            toast.error("You don't have permission to delete schedules");
            return;
        }
        setScheduleToDelete(schedule);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!scheduleToDelete) return;

        if (!canManageSchedules()) {
            toast.error("You don't have permission to delete schedules");
            return;
        }

        setIsDeleting(true);
        try {
            const token = localStorage.getItem("token");
            await axios.delete(
                `/api/schedules/${scheduleToDelete.schedule_id}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            toast.success("Schedule deleted successfully");
            setSchedules((prev) =>
                prev.filter(
                    (s) => s.schedule_id !== scheduleToDelete.schedule_id
                )
            );
            setShowDeleteModal(false);
            setScheduleToDelete(null);
        } catch (error) {
            console.error("Failed to delete schedule:", error);
            toast.error("Failed to delete schedule");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setScheduleToDelete(null);
    };

    const handleEditClick = (scheduleId: number) => {
        if (!canManageSchedules()) {
            toast.error("You don't have permission to edit schedules");
            return;
        }
        setScheduleToEdit(scheduleId);
        setShowEditModal(true);
    };

    const handleEditSuccess = () => {
        fetchSchedules(); // Refresh the list after successful edit
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
        switch (status) {
            case "draft":
                return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
            case "analyzing":
                return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
            case "feasible":
                return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
            case "infeasible":
                return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
            case "pending_approval":
                return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300`;
            case "approved":
                return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
            case "rejected":
                return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
            case "converted":
                return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
        }
    };

    const getPriorityBadge = (priority: string) => {
        const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
        switch (priority) {
            case "low":
                return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
            case "medium":
                return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
            case "high":
                return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
        }
    };

    const getFeasibilityColor = (score: number) => {
        if (score >= 80) return "text-green-600";
        if (score >= 60) return "text-yellow-600";
        return "text-red-600";
    };

    const getFeasibilityStatus = (score: number) => {
        if (score >= 80)
            return {
                text: "High Feasibility",
                icon: <CheckCircle size={16} className="text-green-600" />,
            };
        if (score >= 60)
            return {
                text: "Moderate Feasibility",
                icon: <AlertTriangle size={16} className="text-yellow-600" />,
            };
        return {
            text: "Low Feasibility",
            icon: <XCircle size={16} className="text-red-600" />,
        };
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "OMR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        }).format(new Date(date));
    };

    const getRoleSpecificActions = (role: string) => {
        // Only show actions for privileged roles
        if (!canManageSchedules()) {
            return [];
        }

        const baseActions = [
            {
                action: "create",
                label: "Create Schedule",
                icon: <Plus size={16} />,
                variant: "primary" as const,
            },
        ];

        if (role === "admin") {
            return [...baseActions];
        }

        return baseActions;
    };

    const renderScheduleCard = (schedule: Schedule) => {
        const duration = Math.ceil(
            (new Date(schedule.end_date).getTime() -
                new Date(schedule.start_date).getTime()) /
                (1000 * 60 * 60 * 24)
        );
        const feasibilityStatus = getFeasibilityStatus(
            schedule.feasibility_score
        );

        return (
            <div
                key={schedule.schedule_id}
                className={`bg-white dark:bg-slate-800 border rounded-xl p-6 hover:shadow-lg transition-all group relative ${
                    selectedSchedules.includes(schedule.schedule_id)
                        ? "border-orange-500 ring-2 ring-orange-500 ring-opacity-20 bg-orange-50 dark:bg-orange-900/10"
                        : "border-gray-200 dark:border-slate-700"
                }`}
            >
                {/* Checkbox - only show for privileged users */}
                {canManageSchedules() && (
                    <div className="absolute top-4 right-4 z-10">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedSchedules.includes(
                                    schedule.schedule_id
                                )}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                        setSelectedSchedules((prev) => [
                                            ...prev,
                                            schedule.schedule_id,
                                        ]);
                                    } else {
                                        setSelectedSchedules((prev) =>
                                            prev.filter(
                                                (id) =>
                                                    id !== schedule.schedule_id
                                            )
                                        );
                                    }
                                }}
                                className="sr-only"
                            />
                            <div
                                className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                                    selectedSchedules.includes(
                                        schedule.schedule_id
                                    )
                                        ? "bg-orange-600 border-orange-600"
                                        : "bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:border-orange-400"
                                }`}
                            >
                                {selectedSchedules.includes(
                                    schedule.schedule_id
                                ) && (
                                    <svg
                                        className="w-3 h-3 text-white"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                )}
                            </div>
                        </label>
                    </div>
                )}

                {/* Main content */}
                <div
                    className={`cursor-pointer ${
                        canManageSchedules() ? "pr-8" : ""
                    }`}
                    onClick={() =>
                        router.push(`/scheduler/${schedule.schedule_id}`)
                    }
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="mb-3">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 transition-colors mb-2">
                                    {schedule.name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={getStatusBadge(
                                            schedule.status.toLowerCase()
                                        )}
                                    >
                                        {schedule.status.replace("_", " ")}
                                    </span>
                                    <span
                                        className={getPriorityBadge(
                                            schedule.priority.toLowerCase()
                                        )}
                                    >
                                        {schedule.priority}
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {schedule.description}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span className="flex items-center">
                                    <Calendar size={12} className="mr-1" />
                                    {duration} days
                                </span>
                                <span className="flex items-center">
                                    <Users size={12} className="mr-1" />
                                    {schedule.total_resources} resources
                                </span>
                                <span className="flex items-center">
                                    <Clock size={12} className="mr-1" />
                                    {schedule.total_tasks} tasks
                                </span>
                                <span className="flex items-center">
                                    <DollarSign size={12} className="mr-1" />
                                    {formatCurrency(schedule.budget_amount)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Feasibility Score */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Feasibility
                            </span>
                            <span
                                className={`text-sm font-medium ${getFeasibilityColor(
                                    schedule.feasibility_score
                                )}`}
                            >
                                {schedule.feasibility_score}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    schedule.feasibility_score >= 80
                                        ? "bg-green-500"
                                        : schedule.feasibility_score >= 60
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                }`}
                                style={{
                                    width: `${schedule.feasibility_score}%`,
                                }}
                            ></div>
                        </div>
                    </div>

                    {/* Action Buttons - only show for privileged users */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                                Created:{" "}
                                {formatDate(new Date(schedule.created_at))}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                className="p-1 rounded-md text-gray-400 hover:text-blue-600"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                        `/scheduler/${schedule.schedule_id}`
                                    );
                                }}
                            >
                                <Eye size={16} />
                            </button>
                            {canManageSchedules() && (
                                <>
                                    <button
                                        className="p-1 rounded-md text-gray-400 hover:text-green-600"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditClick(
                                                schedule.schedule_id
                                            );
                                        }}
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        className="p-1 rounded-md text-gray-400 hover:text-red-600"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClick(schedule);
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderFilters = () => (
        <FilterBar
            search={searchQuery}
            onSearch={setSearchQuery}
            searchPlaceholder="Search schedules by name or project…"
            resultLabel={`${filteredSchedules.length} ${filteredSchedules.length === 1 ? "schedule" : "schedules"}`}
            activeCount={
                (statusFilter !== "all" ? 1 : 0) + (priorityFilter !== "all" ? 1 : 0)
            }
            onClear={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
            }}
        >
            <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                    { value: "all", label: "All statuses" },
                    { value: "draft", label: "Draft" },
                    { value: "analyzing", label: "Analyzing" },
                    { value: "feasible", label: "Feasible" },
                    { value: "infeasible", label: "Infeasible" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                    { value: "converted", label: "Converted" },
                ]}
            />
            <FilterSelect
                label="Priority"
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[
                    { value: "all", label: "All priorities" },
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                ]}
            />
        </FilterBar>
    );

    if (loading) {
        return (
            <ProtectedRoute>
                <DashboardLayout
                    title="Project Scheduler"
                    activeView={activeView}
                    onViewChange={setActiveView}
                >
                    <div className="flex items-center justify-center min-h-screen">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <DashboardLayout
                title="Project Scheduler"
                activeView={activeView}
                onViewChange={setActiveView}
            >
                <div className="space-y-6">
                    {/* Header with Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400">
                                Simulate and analyze project schedules before
                                approval
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {/* View Mode Toggle */}
                            <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-2 rounded-md transition-all duration-200 ${
                                        viewMode === "grid"
                                            ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-gray-100 shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    }`}
                                >
                                    <Grid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-2 rounded-md transition-all duration-200 ${
                                        viewMode === "list"
                                            ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-gray-100 shadow-sm"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    }`}
                                >
                                    <List size={16} />
                                </button>
                            </div>


                            {/* Action Buttons */}
                            {getRoleSpecificActions(activeView).map(
                                (action, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            switch (action.action) {
                                                case "create":
                                                    router.push(
                                                        "/scheduler/create"
                                                    );
                                                    break;
                                                case "export":
                                                    // Handle export
                                                    console.log(
                                                        "Export action triggered"
                                                    );
                                                    break;
                                                case "settings":
                                                    // Handle settings
                                                    console.log(
                                                        "Settings action triggered"
                                                    );
                                                    break;
                                                default:
                                                    console.log(
                                                        "Unknown action:",
                                                        action.action
                                                    );
                                            }
                                        }}
                                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 transform hover:scale-105 hover:shadow-lg ${
                                            action.variant === "primary"
                                                ? "bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 shadow-md"
                                                : action.action === "export"
                                                ? "border-2 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 hover:text-green-800 dark:hover:text-green-200"
                                                : "border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700"
                                        }`}
                                    >
                                        {action.icon}
                                        <span className="text-sm">
                                            {action.label}
                                        </span>
                                    </button>
                                )
                            )}
                            {!canManageSchedules() && (
                                <div className="flex items-center space-x-2 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm border">
                                    <Shield size={16} />
                                    <span>Read-only access</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="mb-6">{renderFilters()}</div>

                    {/* Schedule Selection Info */}
                    {canManageSchedules() && selectedSchedules.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-blue-800 dark:text-blue-200 font-medium">
                                        {selectedSchedules.length} schedule(s)
                                        selected
                                    </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 border-2 border-red-700 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md">
                                                <Trash2 size={16} />
                                                <span>Delete Selected</span>
                                            </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>
                                                    Delete {selectedSchedules.length} Schedule(s)?
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the selected schedules and all their associated data (tasks, WBS, budgets, assignments, etc.).
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={async () => {
                                                        if (!canManageSchedules()) {
                                                            toast.error("You don't have permission to delete schedules");
                                                            return;
                                                        }

                                                        try {
                                                            const token = localStorage.getItem("token");
                                                            if (!token) {
                                                                toast.error("Authentication required");
                                                                router.push("/auth/login");
                                                                return;
                                                            }

                                                            const deletePromises = selectedSchedules.map(
                                                                (scheduleId) =>
                                                                    axios.delete(
                                                                        `/api/schedules/${scheduleId}`,
                                                                        {
                                                                            headers: { 
                                                                                Authorization: `Bearer ${token}` 
                                                                            }
                                                                        }
                                                                    )
                                                            );
                                                            
                                                            await Promise.all(deletePromises);
                                                            
                                                            toast.success(
                                                                `${selectedSchedules.length} schedule(s) deleted successfully`
                                                            );
                                                            setSelectedSchedules([]);
                                                            fetchSchedules();
                                                        } catch (error: any) {
                                                            console.error(
                                                                "Error deleting schedules:",
                                                                error
                                                            );
                                                            
                                                            if (error.response?.status === 401) {
                                                                toast.error("Session expired. Please login again.");
                                                                router.push("/auth/login");
                                                            } else if (error.response?.status === 403) {
                                                                toast.error("You don't have permission to delete schedules");
                                                            } else {
                                                                toast.error(
                                                                    "Failed to delete some schedules"
                                                                );
                                                            }
                                                        }
                                                    }}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <button
                                        onClick={() => setSelectedSchedules([])}
                                        className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-white dark:text-blue-400 border-2 border-blue-300 hover:border-blue-600 rounded-lg transition-all duration-200 hover:bg-blue-600 dark:hover:bg-blue-500 transform hover:scale-105"
                                    >
                                        Clear selection
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Schedules Grid/List */}
                    {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredSchedules.map((schedule) =>
                                renderScheduleCard(schedule)
                            )}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-slate-700">
                                        <tr>
                                            {canManageSchedules() && (
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            selectedSchedules.length ===
                                                                filteredSchedules.length &&
                                                            filteredSchedules.length >
                                                                0
                                                        }
                                                        onChange={(e) => {
                                                            if (
                                                                e.target.checked
                                                            ) {
                                                                setSelectedSchedules(
                                                                    filteredSchedules.map(
                                                                        (s) =>
                                                                            s.schedule_id
                                                                    )
                                                                );
                                                            } else {
                                                                setSelectedSchedules(
                                                                    []
                                                                );
                                                            }
                                                        }}
                                                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                                    />
                                                </th>
                                            )}
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Schedule
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Priority
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Duration
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Feasibility
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Budget
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Created
                                            </th>
                                            {canManageSchedules() && (
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                        {filteredSchedules.map((schedule) => {
                                            const duration = Math.ceil(
                                                (new Date(
                                                    schedule.end_date
                                                ).getTime() -
                                                    new Date(
                                                        schedule.start_date
                                                    ).getTime()) /
                                                    (1000 * 60 * 60 * 24)
                                            );
                                            return (
                                                <tr
                                                    key={schedule.schedule_id}
                                                    className={`hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                                                        selectedSchedules.includes(
                                                            schedule.schedule_id
                                                        )
                                                            ? "bg-orange-50 dark:bg-orange-900/10"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        router.push(
                                                            `/scheduler/${schedule.schedule_id}`
                                                        )
                                                    }
                                                >
                                                    {canManageSchedules() && (
                                                        <td
                                                            className="px-6 py-4 whitespace-nowrap"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedSchedules.includes(
                                                                    schedule.schedule_id
                                                                )}
                                                                onChange={(
                                                                    e
                                                                ) => {
                                                                    if (
                                                                        e.target
                                                                            .checked
                                                                    ) {
                                                                        setSelectedSchedules(
                                                                            (
                                                                                prev
                                                                            ) => [
                                                                                ...prev,
                                                                                schedule.schedule_id,
                                                                            ]
                                                                        );
                                                                    } else {
                                                                        setSelectedSchedules(
                                                                            (
                                                                                prev
                                                                            ) =>
                                                                                prev.filter(
                                                                                    (
                                                                                        id
                                                                                    ) =>
                                                                                        id !==
                                                                                        schedule.schedule_id
                                                                                )
                                                                        );
                                                                    }
                                                                }}
                                                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                {schedule.name}
                                                            </div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                {
                                                                    schedule.description
                                                                }
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={getStatusBadge(
                                                                schedule.status.toLowerCase()
                                                            )}
                                                        >
                                                            {schedule.status.replace(
                                                                "_",
                                                                " "
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={getPriorityBadge(
                                                                schedule.priority.toLowerCase()
                                                            )}
                                                        >
                                                            {schedule.priority}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                        {duration} days
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                                <div
                                                                    className={`h-2 rounded-full transition-all duration-300 ${
                                                                        schedule.feasibility_score >=
                                                                        80
                                                                            ? "bg-green-500"
                                                                            : schedule.feasibility_score >=
                                                                              60
                                                                            ? "bg-yellow-500"
                                                                            : "bg-red-500"
                                                                    }`}
                                                                    style={{
                                                                        width: `${schedule.feasibility_score}%`,
                                                                    }}
                                                                ></div>
                                                            </div>
                                                            <span
                                                                className={`text-sm font-medium ${getFeasibilityColor(
                                                                    schedule.feasibility_score
                                                                )}`}
                                                            >
                                                                {
                                                                    schedule.feasibility_score
                                                                }
                                                                %
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                        {formatCurrency(
                                                            schedule.budget_amount
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {formatDate(
                                                            new Date(
                                                                schedule.created_at
                                                            )
                                                        )}
                                                    </td>
                                                    {canManageSchedules() && (
                                                        <td
                                                            className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            <div className="flex items-center justify-end space-x-2">
                                                                <button
                                                                    className="p-1 rounded-md text-gray-400 hover:text-blue-600"
                                                                    onClick={() =>
                                                                        router.push(
                                                                            `/scheduler/${schedule.schedule_id}`
                                                                        )
                                                                    }
                                                                >
                                                                    <Eye
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </button>
                                                                <button
                                                                    className="p-1 rounded-md text-gray-400 hover:text-green-600"
                                                                    onClick={() =>
                                                                        handleEditClick(
                                                                            schedule.schedule_id
                                                                        )
                                                                    }
                                                                >
                                                                    <Edit
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </button>
                                                                <button
                                                                    className="p-1 rounded-md text-gray-400 hover:text-red-600"
                                                                    onClick={() =>
                                                                        handleDeleteClick(
                                                                            schedule
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredSchedules.length === 0 && (
                        <div className="text-center py-12">
                            <Calendar
                                size={48}
                                className="mx-auto text-gray-400 mb-4"
                            />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No schedules found
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {schedules.length === 0
                                    ? canManageSchedules()
                                        ? "Create your first project schedule to get started."
                                        : "No project schedules have been created yet."
                                    : "Try adjusting your filters to see more results."}
                            </p>
                            {schedules.length === 0 && canManageSchedules() && (
                                <button
                                    onClick={() =>
                                        router.push("/scheduler/create")
                                    }
                                    className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:from-orange-700 hover:to-orange-800 mx-auto"
                                >
                                    <Plus size={18} />
                                    <span>Create New Schedule</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    <div
                        className={`fixed inset-0 bg-transparent backdrop-blur-xs z-50 flex items-center justify-center ${
                            showDeleteModal ? "block" : "hidden"
                        }`}
                        onClick={handleDeleteCancel}
                    >
                        <div
                            className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                                        <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        Delete Schedule
                                    </h3>
                                </div>
                                <button
                                    onClick={handleDeleteCancel}
                                    className="text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Are you sure you want to delete{" "}
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {scheduleToDelete?.name}
                                </span>
                                ? This action cannot be undone and all
                                associated data will be permanently removed.
                            </p>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={handleDeleteCancel}
                                    disabled={isDeleting}
                                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting
                                        ? "Deleting..."
                                        : "Delete Schedule"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Schedule Modal */}
                <EditScheduleModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setScheduleToEdit(null);
                    }}
                    scheduleId={scheduleToEdit}
                    onSuccess={handleEditSuccess}
                />
            </DashboardLayout>
        </ProtectedRoute>
    );
};

export default SchedulerPage;
