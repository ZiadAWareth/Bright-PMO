"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import RoleGuard from "@/components/auth/RoleGuard";
import useCurrentUser from "@/hooks/useCurrentUser";
import { canAccessRoute } from "@/lib/route-access";
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
import { LoadingState, Spinner } from "@/components/ui/spinner";
import { ListPagination } from "@/components/ui/list-pagination";
import { ViewToggle, type ListViewMode } from "@/components/ui/view-toggle";
import {
    EmptyState,
    EntityCard,
    EntityCardFooter,
    EntityCardHeader,
    EntityProgress,
    EntityStat,
    EntityStats,
} from "@/components/ui/entity-card";
import {
    ListCard,
    ListMessage,
    ListRow,
    NewButton,
    RowAction,
    RowActions,
    StatusBadge,
} from "@/components/ui/form-shell";
import {
    feasibilityTone,
    humanize,
    priorityTone,
    scheduleStatusTone,
} from "@/lib/status-tone";

const PAGE_SIZE = 12;
const SCHEDULE_COLUMNS = [
    "Schedule",
    "Status",
    "Priority",
    "Duration",
    "Feasibility",
    "Budget",
    "Created",
];

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

const SchedulerPage = () => {
    const router = useRouter();
    const [activeView, setActiveView] = useState("admin");
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<ListViewMode>("grid");
    const [page, setPage] = useState(0);

    // Filtering changes what "page 1" means, so reset rather than stranding the
    // user on a page index that no longer has rows.
    useEffect(
        () => setPage(0),
        [searchQuery, statusFilter, priorityFilter, viewMode]
    );

    const schedulePageCount = Math.max(
        1,
        Math.ceil(filteredSchedules.length / PAGE_SIZE)
    );
    const visibleSchedules = filteredSchedules.slice(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE
    );
    const [showFilters, setShowFilters] = useState(false);
    const [selectedSchedules, setSelectedSchedules] = useState<number[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(
        null
    );
    const [isDeleting, setIsDeleting] = useState(false);
    const [scheduleToEdit, setScheduleToEdit] = useState<number | null>(null);
    // The signed-in role, from the shared cache rather than a local fetch of
    // /api/auth/me. Exposes `roleLoading` so "not known yet" stays distinct
    // from "not permitted" — see `permissionState` below.
    const { userRole, roleLoading } = useCurrentUser();

    /**
     * Whether the current role may create, edit or delete schedules.
     *
     * Three states, not two. The old check read `user === null` as "denied",
     * but null is the value before the fetch resolves, so every visitor — including
     * PMO and ADMIN — got one frame of the read-only screen before the
     * permitted one replaced it. Callers must handle "loading" by rendering
     * neither branch.
     */
    const permissionState: "loading" | "allowed" | "denied" = roleLoading
        ? "loading"
        : canAccessRoute("/scheduler", userRole)
          ? "allowed"
          : "denied";

    /**
     * Roles come from `ROUTE_ROLES["/scheduler"]` rather than a list copied
     * into this file, so the page controls and the route guard can never
     * disagree about who may manage a schedule.
     */
    const canManageSchedules = () => permissionState === "allowed";

    useEffect(() => {
        fetchSchedules();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [schedules, searchQuery, statusFilter, priorityFilter]);

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
        router.push(`/scheduler/${scheduleId}/edit`);
    };

    const handleEditSuccess = () => {
        fetchSchedules(); // Refresh the list after successful edit
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
        switch (status) {
            case "draft":
                return `${baseClasses} bg-surface-2 text-ink-2  `;
            case "analyzing":
                return `${baseClasses} bg-warning-soft text-warning  `;
            case "feasible":
                return `${baseClasses} bg-success-soft text-success  `;
            case "infeasible":
                return `${baseClasses} bg-danger-soft text-danger  `;
            case "pending_approval":
                return `${baseClasses} bg-accent-violet-soft text-accent-violet  `;
            case "approved":
                return `${baseClasses} bg-info-soft text-info  `;
            case "rejected":
                return `${baseClasses} bg-danger-soft text-danger  `;
            case "converted":
                return `${baseClasses} bg-accent-violet-soft text-accent-violet  `;
            default:
                return `${baseClasses} bg-surface-2 text-ink-2  `;
        }
    };

    const getPriorityBadge = (priority: string) => {
        const baseClasses = "px-2 py-1 rounded-md text-xs font-medium";
        switch (priority) {
            case "low":
                return `${baseClasses} bg-success-soft text-success  `;
            case "medium":
                return `${baseClasses} bg-warning-soft text-warning  `;
            case "high":
                return `${baseClasses} bg-bright-soft text-bright  `;
            default:
                return `${baseClasses} bg-surface-2 text-ink-2  `;
        }
    };

    const getFeasibilityColor = (score: number) => {
        if (score >= 80) return "text-success";
        if (score >= 60) return "text-warning";
        return "text-danger";
    };

    const getFeasibilityStatus = (score: number) => {
        if (score >= 80)
            return {
                text: "High Feasibility",
                icon: <CheckCircle size={16} className="text-success" />,
            };
        if (score >= 60)
            return {
                text: "Moderate Feasibility",
                icon: <AlertTriangle size={16} className="text-warning" />,
            };
        return {
            text: "Low Feasibility",
            icon: <XCircle size={16} className="text-danger" />,
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
        const isSelected = selectedSchedules.includes(schedule.schedule_id);

        return (
            <EntityCard
                key={schedule.schedule_id}
                selected={isSelected}
                onClick={() => router.push(`/scheduler/${schedule.schedule_id}`)}
            >
                <EntityCardHeader
                    title={schedule.name}
                    subtitle={schedule.description}
                    badges={
                        <>
                            <StatusBadge
                                label={humanize(schedule.status)}
                                tone={scheduleStatusTone(schedule.status)}
                            />
                            <StatusBadge
                                label={humanize(schedule.priority)}
                                tone={priorityTone(schedule.priority)}
                            />
                        </>
                    }
                />

                <EntityStats>
                    <EntityStat icon={<Clock className="h-3.5 w-3.5" />}>
                        {duration} days
                    </EntityStat>
                    <EntityStat icon={<Users className="h-3.5 w-3.5" />}>
                        {schedule.total_resources} resources
                    </EntityStat>
                    <EntityStat icon={<CheckCircle className="h-3.5 w-3.5" />}>
                        {schedule.total_tasks} tasks
                    </EntityStat>
                    <EntityStat icon={<DollarSign className="h-3.5 w-3.5" />}>
                        {schedule.budget_amount?.toLocaleString() ?? "—"}
                    </EntityStat>
                </EntityStats>

                <EntityProgress
                    label="Feasibility"
                    value={schedule.feasibility_score}
                    tone={feasibilityTone(schedule.feasibility_score)}
                />

                <EntityCardFooter
                    actions={
                        <div onClick={(e) => e.stopPropagation()}>
                            <RowActions>
                                <RowAction
                                    icon={Eye}
                                    label={`View ${schedule.name}`}
                                    onClick={() =>
                                        router.push(
                                            `/scheduler/${schedule.schedule_id}`
                                        )
                                    }
                                />
                                {canManageSchedules() && (
                                    <>
                                        <RowAction
                                            icon={Edit}
                                            label={`Edit ${schedule.name}`}
                                            onClick={() =>
                                                handleEditClick(
                                                    schedule.schedule_id
                                                )
                                            }
                                        />
                                        <RowAction
                                            icon={Trash2}
                                            label={`Delete ${schedule.name}`}
                                            tone="danger"
                                            onClick={() =>
                                                handleDeleteClick(schedule)
                                            }
                                        />
                                    </>
                                )}
                            </RowActions>
                        </div>
                    }
                >
                    {canManageSchedules() ? (
                        <label
                            className="flex cursor-pointer items-center gap-2 text-[12px] text-muted"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                type="checkbox"
                                aria-label={`Select ${schedule.name}`}
                                checked={isSelected}
                                onChange={(e) => {
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
                                className="rounded border-line text-bright focus:ring-bright"
                            />
                            Select
                        </label>
                    ) : (
                        <span className="text-[12px] text-faint">
                            {new Date(
                                schedule.created_at
                            ).toLocaleDateString()}
                        </span>
                    )}
                </EntityCardFooter>
            </EntityCard>
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
            <RoleGuard route="/scheduler" title="Project Scheduler">
                <DashboardLayout
                    title="Project Scheduler"
                    activeView={activeView}
                    onViewChange={setActiveView}
                >
                    <div className="flex items-center justify-center min-h-screen">
                        <Spinner size={64} className="text-bright-primary" />
                    </div>
                </DashboardLayout>
            </RoleGuard>
        );
    }

    return (
        <RoleGuard route="/scheduler" title="Project Scheduler">
            <DashboardLayout
                title="Project Scheduler"
                subtitle="Simulate and analyze project schedules before approval."
                activeView={activeView}
                onViewChange={setActiveView}
                actions={
                    <>
                        <ViewToggle value={viewMode} onChange={setViewMode} />
                        {getRoleSpecificActions(activeView).map(
                            (action, index) =>
                                action.action === "create" ? (
                                    <NewButton
                                        key={index}
                                        href="/scheduler/new"
                                        label={action.label}
                                    />
                                ) : null
                        )}
                        {permissionState === "denied" && (
                            <span className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-[13px] text-muted">
                                <Shield size={15} aria-hidden="true" />
                                Read-only access
                            </span>
                        )}
                    </>
                }
            >
                <div className="space-y-6">
                    {/* Filters */}
                    {renderFilters()}

                    {/* Schedule Selection Info */}
                    {canManageSchedules() && selectedSchedules.length > 0 && (
                        <div className="bg-gradient-to-r from-info-soft to-info-soft border-2 border-info rounded-xl p-4 mb-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 bg-info rounded-full animate-pulse"></div>
                                    <span className="text-info font-medium">
                                        {selectedSchedules.length} schedule(s)
                                        selected
                                    </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-danger hover:opacity-90 border-2 border-danger rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md">
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
                                                    className="bg-danger hover:opacity-90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <button
                                        onClick={() => setSelectedSchedules([])}
                                        className="px-3 py-1.5 text-sm font-medium text-info hover:text-white border-2 border-info hover:border-info rounded-lg transition-all duration-200 hover:opacity-90 transform hover:scale-105"
                                    >
                                        Clear selection
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Schedules Grid/List */}
                    {filteredSchedules.length === 0 ? (
                        <EmptyState
                            icon={<Calendar className="h-10 w-10" />}
                            title="No schedules found"
                            message={
                                schedules.length === 0
                                    ? permissionState === "allowed"
                                        ? "Create your first project schedule to get started."
                                        : "No project schedules have been created yet."
                                    : "Try adjusting your filters to see more results."
                            }
                            action={
                                schedules.length === 0 ? (
                                    canManageSchedules() ? (
                                        <NewButton
                                            href="/scheduler/new"
                                            label="New schedule"
                                        />
                                    ) : undefined
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setStatusFilter("all");
                                            setPriorityFilter("all");
                                        }}
                                        className="text-[13px] font-semibold text-bright hover:text-bright-deep"
                                    >
                                        Clear all filters
                                    </button>
                                )
                            }
                        />
                    ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {visibleSchedules.map((schedule) =>
                                renderScheduleCard(schedule)
                            )}
                        </div>
                    ) : (
                        <ListCard>
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-surface-2">
                                        {canManageSchedules() && (
                                            <th className="w-0 border-b border-line px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    aria-label="Select all schedules on this page"
                                                    checked={
                                                        visibleSchedules.length > 0 &&
                                                        visibleSchedules.every((s) =>
                                                            selectedSchedules.includes(
                                                                s.schedule_id
                                                            )
                                                        )
                                                    }
                                                    onChange={(e) => {
                                                        const ids =
                                                            visibleSchedules.map(
                                                                (s) => s.schedule_id
                                                            );
                                                        if (e.target.checked) {
                                                            setSelectedSchedules((prev) =>
                                                                Array.from(
                                                                    new Set([
                                                                        ...prev,
                                                                        ...ids,
                                                                    ])
                                                                )
                                                            );
                                                        } else {
                                                            setSelectedSchedules((prev) =>
                                                                prev.filter(
                                                                    (id) =>
                                                                        !ids.includes(id)
                                                                )
                                                            );
                                                        }
                                                    }}
                                                    className="rounded border-line text-bright focus:ring-bright"
                                                />
                                            </th>
                                        )}
                                        {SCHEDULE_COLUMNS.map((heading) => (
                                            <th
                                                key={heading}
                                                className="whitespace-nowrap border-b border-line px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint"
                                            >
                                                {heading}
                                            </th>
                                        ))}
                                        <th className="w-0 border-b border-line px-4 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleSchedules.length === 0 ? (
                                        <ListMessage
                                            colSpan={
                                                SCHEDULE_COLUMNS.length +
                                                (canManageSchedules() ? 2 : 1)
                                            }
                                        >
                                            No schedules on this page.
                                        </ListMessage>
                                    ) : (
                                        visibleSchedules.map((schedule) => {
                                            const duration = Math.ceil(
                                                (new Date(
                                                    schedule.end_date
                                                ).getTime() -
                                                    new Date(
                                                        schedule.start_date
                                                    ).getTime()) /
                                                    (1000 * 60 * 60 * 24)
                                            );
                                            const isSelected =
                                                selectedSchedules.includes(
                                                    schedule.schedule_id
                                                );

                                            return (
                                                <ListRow
                                                    key={schedule.schedule_id}
                                                    selected={isSelected}
                                                    onClick={() =>
                                                        router.push(
                                                            `/scheduler/${schedule.schedule_id}`
                                                        )
                                                    }
                                                >
                                                    {canManageSchedules() && (
                                                        <td
                                                            className="px-4 py-3"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                aria-label={`Select ${schedule.name}`}
                                                                checked={isSelected}
                                                                onChange={(e) => {
                                                                    if (
                                                                        e.target.checked
                                                                    ) {
                                                                        setSelectedSchedules(
                                                                            (prev) => [
                                                                                ...prev,
                                                                                schedule.schedule_id,
                                                                            ]
                                                                        );
                                                                    } else {
                                                                        setSelectedSchedules(
                                                                            (prev) =>
                                                                                prev.filter(
                                                                                    (id) =>
                                                                                        id !==
                                                                                        schedule.schedule_id
                                                                                )
                                                                        );
                                                                    }
                                                                }}
                                                                className="rounded border-line text-bright focus:ring-bright"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="max-w-[280px] px-4 py-3">
                                                        <div className="min-w-0">
                                                            <div className="truncate text-[13.5px] font-medium text-ink">
                                                                {schedule.name}
                                                            </div>
                                                            {schedule.description && (
                                                                <div className="truncate text-[11.5px] text-faint">
                                                                    {
                                                                        schedule.description
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        <StatusBadge
                                                            label={humanize(
                                                                schedule.status
                                                            )}
                                                            tone={scheduleStatusTone(
                                                                schedule.status
                                                            )}
                                                        />
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        <StatusBadge
                                                            label={humanize(
                                                                schedule.priority
                                                            )}
                                                            tone={priorityTone(
                                                                schedule.priority
                                                            )}
                                                        />
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
                                                        {duration} days
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
                                                                <div
                                                                    className={`h-full rounded-full ${
                                                                        feasibilityTone(
                                                                            schedule.feasibility_score
                                                                        ) === "success"
                                                                            ? "bg-success"
                                                                            : feasibilityTone(
                                                                                    schedule.feasibility_score
                                                                                ) ===
                                                                                "warning"
                                                                              ? "bg-warning"
                                                                              : "bg-danger"
                                                                    }`}
                                                                    style={{
                                                                        width: `${Math.min(100, Math.max(0, schedule.feasibility_score))}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-[12px] tabular-nums text-muted">
                                                                {Math.round(
                                                                    schedule.feasibility_score
                                                                )}
                                                                %
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-[13.5px] tabular-nums text-ink-2">
                                                        {schedule.budget_amount?.toLocaleString() ??
                                                            "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-[13.5px] text-ink-2">
                                                        {new Date(
                                                            schedule.created_at
                                                        ).toLocaleDateString()}
                                                    </td>
                                                    <td
                                                        className="px-4 py-3"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <RowActions>
                                                            <RowAction
                                                                icon={Eye}
                                                                label={`View ${schedule.name}`}
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/scheduler/${schedule.schedule_id}`
                                                                    )
                                                                }
                                                            />
                                                            {canManageSchedules() && (
                                                                <>
                                                                    <RowAction
                                                                        icon={Edit}
                                                                        label={`Edit ${schedule.name}`}
                                                                        onClick={() =>
                                                                            handleEditClick(
                                                                                schedule.schedule_id
                                                                            )
                                                                        }
                                                                    />
                                                                    <RowAction
                                                                        icon={Trash2}
                                                                        label={`Delete ${schedule.name}`}
                                                                        tone="danger"
                                                                        onClick={() =>
                                                                            handleDeleteClick(
                                                                                schedule
                                                                            )
                                                                        }
                                                                    />
                                                                </>
                                                            )}
                                                        </RowActions>
                                                    </td>
                                                </ListRow>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </ListCard>
                    )}

                    {filteredSchedules.length > 0 && (
                        <ListPagination
                            page={page}
                            pageCount={schedulePageCount}
                            total={filteredSchedules.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setPage}
                            noun="schedule"
                        />
                    )}

                    {/* Delete Confirmation Modal */}
                    <div
                        className={`fixed inset-0 bg-transparent backdrop-blur-xs z-50 flex items-center justify-center ${
                            showDeleteModal ? "block" : "hidden"
                        }`}
                        onClick={handleDeleteCancel}
                    >
                        <div
                            className="bg-surface rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-bright-soft rounded-lg">
                                        <AlertTriangle className="h-6 w-6 text-bright" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-ink">
                                        Delete Schedule
                                    </h3>
                                </div>
                                <button
                                    onClick={handleDeleteCancel}
                                    className="text-faint hover:text-bright"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-muted mb-6">
                                Are you sure you want to delete{" "}
                                <span className="font-semibold text-ink">
                                    {scheduleToDelete?.name}
                                </span>
                                ? This action cannot be undone and all
                                associated data will be permanently removed.
                            </p>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={handleDeleteCancel}
                                    disabled={isDeleting}
                                    className="px-4 py-2 border border-line rounded-lg text-sm font-medium text-ink-3 hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bright disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    disabled={isDeleting}
                                    className="px-4 py-2 bg-bright text-white rounded-lg text-sm font-medium hover:bg-bright-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bright disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting
                                        ? "Deleting..."
                                        : "Delete Schedule"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </DashboardLayout>
        </RoleGuard>
    );
};

export default SchedulerPage;
