"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    ArrowLeft,
    Calendar,
    Clock,
    Target,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    PauseCircle,
    Download,
    Upload,
    MoreHorizontal,
    SortAsc,
    SortDesc,
    Eye,
    Edit,
    Trash2,
    User,
    FileText,
    Plus,
    Lock,
} from "lucide-react";
import { ProjectWithRelations } from "@/types/project";
import axios from "axios";
import { toast } from "sonner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Spinner } from "@/components/ui/spinner";
import { Dropdown } from "@/components/ui/dropdown";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { StatGrid, StatTile } from "@/components/ui/entity-card";
import { ListPagination } from "@/components/ui/list-pagination";

interface Task {
    task_id: number;
    name: string;
    description: string;
    status: "todo" | "in_progress" | "completed" | "on_hold";
    priority: "low" | "medium" | "high";
    start_date: string;
    end_date: string;
    estimated_hours: number;
    actual_hours: number;
    progress_percentage: number;
    work_package: string;
    is_milestone: boolean;
    assigned_users?: Array<{
        user: {
            user_id: number;
            account: {
                first_name: string;
                last_name: string;
            };
        };
    }>;
    // Tasks that THIS task depends on (this task is the successor)
    successor_dependencies?: Array<{
        dependency_id: number;
        predecessor_task_id: number;
        dependency_type:
            | "finish_to_start"
            | "start_to_start"
            | "finish_to_finish"
            | "start_to_finish";
        lag_time: number;
        predecessor: {
            task_id: number;
            name: string;
            status: "todo" | "in_progress" | "completed" | "on_hold";
            progress_percentage: number;
            end_date: string;
        };
    }>;
}

const PAGE_SIZE = 10;

const MyTasksPage = ({ params }: { params: Promise<{ id: string }> }) => {
    const router = useRouter();
    const [activeView, setActiveView] = useState("technical");
    const [project, setProject] = useState<ProjectWithRelations | null>(null);
    const [loading, setLoading] = useState(true);
    const [projectId, setProjectId] = useState<string>("");
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

    // Filter and search states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<
        "due_date" | "priority" | "progress" | "name"
    >("due_date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(0);

    // Progress modal states
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);


    // Helper function to check if user is a technical team member
    const isTechnicalTeamMember = (role: string | null) => {
        if (!role) return true; // Default to technical view if no role
        const technicalRoles = [
            "eng",
            "technical",
            "engineer",
            "developer",
            "site",
            "qaqc",
            "engineering",
            "development",
            "qa",
            "qc",
            "field",
            "technician",
            "specialist",
            "analyst",
            "designer",
            "architect",
        ];
        return technicalRoles.includes(role.toLowerCase());
    };

    // Helper function to check if user is admin/management
    const isAdminOrManager = (role: string | null) => {
        if (!role) return false;
        const adminRoles = [
            "admin",
            "administrator",
            "pjm",
            "project manager",
            "project-manager",
            "pmo",
            "dir",
        ];
        return adminRoles.includes(role.toLowerCase());
    };

    // Helper function to check task dependencies and lock status
    const getTaskLockStatus = (task: Task) => {
        console.log(`\n🔒 Checking lock status for: ${task.name} (ID: ${task.task_id})`);
        
        if (
            !task.successor_dependencies ||
            task.successor_dependencies.length === 0
        ) {
            console.log("  ✅ No dependencies - task is NOT locked");
            return { isLocked: false, reasons: [] };
        }

        console.log(`  📊 Found ${task.successor_dependencies.length} predecessor dependencies`);

        const incompleteDependendencies = task.successor_dependencies.filter(
            (dep) => {
                console.log(`    🔗 Dependency: ${dep.predecessor.name} (${dep.dependency_type})`);
                console.log(`       Predecessor Status: ${dep.predecessor.status}`);
                
                let shouldBlock = false;
                switch (dep.dependency_type) {
                    case "finish_to_start":
                        shouldBlock = dep.predecessor.status !== "completed";
                        console.log(`       Finish-to-Start: ${shouldBlock ? "❌ BLOCKS" : "✅ OK"} (needs completed)`);
                        return shouldBlock;
                    case "start_to_start":
                        shouldBlock = dep.predecessor.status === "todo";
                        console.log(`       Start-to-Start: ${shouldBlock ? "❌ BLOCKS" : "✅ OK"} (needs started)`);
                        return shouldBlock;
                    case "finish_to_finish":
                        shouldBlock = dep.predecessor.status !== "completed";
                        console.log(`       Finish-to-Finish: ${shouldBlock ? "❌ BLOCKS" : "✅ OK"} (needs completed)`);
                        return shouldBlock;
                    case "start_to_finish":
                        shouldBlock = dep.predecessor.status === "todo";
                        console.log(`       Start-to-Finish: ${shouldBlock ? "❌ BLOCKS" : "✅ OK"} (needs started)`);
                        return shouldBlock;
                    default:
                        console.log(`       ⚠️ Unknown dependency type: ${dep.dependency_type}`);
                        return false;
                }
            }
        );

        const isLocked = incompleteDependendencies.length > 0;
        console.log(`  ${isLocked ? "🔒 TASK IS LOCKED" : "✅ TASK IS UNLOCKED"} (${incompleteDependendencies.length} incomplete dependencies)`);
        
        const reasons = incompleteDependendencies.map((dep) => {
            let reasonText = "";
            switch (dep.dependency_type) {
                case "finish_to_start":
                    reasonText = `"${dep.predecessor.name}" must be completed first`;
                    break;
                case "start_to_start":
                    reasonText = `"${dep.predecessor.name}" must be started first`;
                    break;
                case "finish_to_finish":
                    reasonText = `"${dep.predecessor.name}" must be completed before this task can finish`;
                    break;
                case "start_to_finish":
                    reasonText = `"${dep.predecessor.name}" must be started before this task can finish`;
                    break;
            }
            return reasonText;
        });

        if (reasons.length > 0) {
            console.log("  📝 Lock reasons:", reasons);
        }

        return { isLocked, reasons };
    };

    // Helper function to check if user can access a locked task
    const canAccessLockedTask = (role: string | null) => {
        if (!role) return false;
        const privilegedRoles = ["ADMIN", "PJM", "PMO", "IT", "DIR"];
        return privilegedRoles.includes(role.toUpperCase());
    };

    // Helper function to get page title based on user role
    const getPageTitle = () => {
        return isAdminOrManager(currentUserRole) ? "Project Tasks" : "My Tasks";
    };

    // Helper function to get page description based on user role
    const getPageDescription = () => {
        return isAdminOrManager(currentUserRole)
            ? `All tasks in ${project?.name || "this project"}`
            : `Tasks assigned to you in ${project?.name || "this project"}`;
    };

    useEffect(() => {
        const getParams = async () => {
            const resolvedParams = await params;
            setProjectId(resolvedParams.id);
        };
        getParams();
    }, [params]);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const response = await axios.get("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.data && response.data.user) {
                    setCurrentUserId(response.data.user.user_id);
                    // Set user role - check if user has admin role
                    if (
                        response.data.user.role &&
                        response.data.user.role.name
                    ) {
                        const roleName =
                            response.data.user.role.name.toLowerCase();
                        setCurrentUserRole(roleName);
                        console.log("User role detected:", roleName); // Debug logging
                    } else {
                        console.log("No role found for user"); // Debug logging
                    }
                }
            } catch (error) {
                console.error("Error fetching current user:", error);
            }
        };

        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (!projectId) return;

        const fetchProject = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`/api/projects/${projectId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                });

                setProject(response.data);

                // 🔍 DEBUG: Log all tasks with their dependencies
                console.log("=== TASK DEPENDENCY DEBUG ===");
                console.log("Total tasks in project:", response.data.tasks?.length);
                response.data.tasks?.forEach((task: Task) => {
                    console.log(`\n📋 Task: ${task.name} (ID: ${task.task_id})`);
                    console.log("  Status:", task.status);
                    console.log("  Successor Dependencies (tasks this depends on):", task.successor_dependencies);
                    if (task.successor_dependencies && task.successor_dependencies.length > 0) {
                        task.successor_dependencies.forEach((dep) => {
                            console.log(`    ➡️ Depends on: ${dep.predecessor.name} (ID: ${dep.predecessor_task_id})`);
                            console.log(`       Type: ${dep.dependency_type}, Status: ${dep.predecessor.status}`);
                        });
                    } else {
                        console.log("    ✅ No predecessor dependencies");
                    }
                });
                console.log("=== END DEBUG ===\n");

                // Role-based task filtering
                let tasksToShow = [];

                console.log(
                    "Filtering tasks for role:",
                    currentUserRole,
                    "User ID:",
                    currentUserId
                ); // Debug logging
                console.log(
                    "Is admin/manager:",
                    isAdminOrManager(currentUserRole)
                ); // Debug logging
                console.log(
                    "Is technical team:",
                    isTechnicalTeamMember(currentUserRole)
                ); // Debug logging
                console.log(
                    "Total tasks available:",
                    response.data.tasks?.length
                ); // Debug logging

                if (isAdminOrManager(currentUserRole)) {
                    // Admins and project managers see all tasks in the project
                    tasksToShow = response.data.tasks || [];
                    console.log(
                        "Showing all tasks for admin/manager:",
                        tasksToShow.length
                    ); // Debug logging
                } else if (isTechnicalTeamMember(currentUserRole)) {
                    // Technical team members see only tasks assigned to them
                    console.log(
                        "Filtering tasks for technical user. Available tasks:"
                    ); // Debug logging
                    response.data.tasks?.forEach(
                        (task: Task, index: number) => {
                            console.log(
                                `Task ${index + 1}:`,
                                task.name,
                                "Assigned users:",
                                task.assigned_users?.map((a) => a.user.user_id)
                            );
                        }
                    );

                    tasksToShow =
                        response.data.tasks?.filter((task: Task) =>
                            task.assigned_users?.some(
                                (assignment) =>
                                    assignment.user.user_id === currentUserId
                            )
                        ) || [];

                    // TEMPORARY: If no assigned tasks found, show all tasks for debugging
                    if (
                        tasksToShow.length === 0 &&
                        response.data.tasks?.length > 0
                    ) {
                        console.log(
                            "⚠️ No assigned tasks found, showing all tasks for debugging"
                        );
                        tasksToShow = response.data.tasks;
                    }
                    console.log(
                        "Showing filtered tasks for technical user:",
                        tasksToShow.length
                    ); // Debug logging
                    console.log(
                        "Tasks assigned to current user:",
                        tasksToShow.map((t: Task) => t.name)
                    ); // Debug logging
                } else {
                    // Default case - show all tasks for other roles (fallback)
                    tasksToShow = response.data.tasks || [];
                    console.log(
                        "Showing all tasks (default):",
                        tasksToShow.length
                    ); // Debug logging
                }

                setTasks(tasksToShow);
                setFilteredTasks(tasksToShow);
            } catch (error) {
                console.error("Error fetching project data:", error);
                toast.error("Failed to load project data");
            } finally {
                setLoading(false);
            }
        };

        if (currentUserId && currentUserRole) {
            fetchProject();
        }
    }, [projectId, currentUserId, currentUserRole]);

    // Filter and sort tasks
    useEffect(() => {
        let filtered = tasks.filter((task) => {
            // Search filter
            const matchesSearch =
                task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.description
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                task.work_package
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());

            // Status filter
            const matchesStatus =
                statusFilter === "all" || task.status === statusFilter;

            // Priority filter
            const matchesPriority =
                priorityFilter === "all" || task.priority === priorityFilter;

            return matchesSearch && matchesStatus && matchesPriority;
        });

        // Sort tasks
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case "due_date":
                    aValue = new Date(a.end_date).getTime();
                    bValue = new Date(b.end_date).getTime();
                    break;
                case "priority":
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    aValue = priorityOrder[a.priority];
                    bValue = priorityOrder[b.priority];
                    break;
                case "progress":
                    aValue = a.progress_percentage;
                    bValue = b.progress_percentage;
                    break;
                case "name":
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                default:
                    aValue = 0;
                    bValue = 0;
            }

            if (sortOrder === "asc") {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        setFilteredTasks(filtered);
        setPage(0);
    }, [tasks, searchQuery, statusFilter, priorityFilter, sortBy, sortOrder]);

    const getStatusBadge = (status: string) => {
        const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
        switch (status) {
            case "todo":
                return `${baseClasses} bg-surface-2 text-ink-2  `;
            case "in_progress":
                return `${baseClasses} bg-info-soft text-info  `;
            case "completed":
                return `${baseClasses} bg-success-soft text-success  `;
            case "on_hold":
                return `${baseClasses} bg-warning-soft text-warning  `;
            default:
                return baseClasses;
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "todo":
                return <Clock className="w-4 h-4" />;
            case "in_progress":
                return <RefreshCw className="w-4 h-4" />;
            case "completed":
                return <CheckCircle className="w-4 h-4" />;
            case "on_hold":
                return <AlertTriangle className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    const handleUpdateProgress = async (task: Task) => {
        setSelectedTask(task);
        setShowProgressModal(true);
    };

    const submitProgressUpdate = async (data: Record<string, any>) => {
        if (!selectedTask) return;

        setIsUpdatingProgress(true);

        try {
            const response = await axios.put(
                `/api/tasks/${selectedTask.task_id}`,
                {
                    progress_percentage: parseInt(data.progress_percentage),
                    status: data.status,
                    actual_hours: data.actual_hours
                        ? parseFloat(data.actual_hours)
                        : undefined,
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                            "token"
                        )}`,
                    },
                }
            );

            if (response.status === 200) {
                // Update the task in the local state
                const updatedTasks = tasks.map((task) =>
                    task.task_id === selectedTask.task_id
                        ? { ...task, ...response.data }
                        : task
                );
                setTasks(updatedTasks);

                setShowProgressModal(false);
                setSelectedTask(null);
                toast.success("Task progress updated successfully");
            }
        } catch (error: any) {
            console.error("Error updating task progress:", error);
            const errorData = error.response?.data;
            if (errorData?.reasons && Array.isArray(errorData.reasons) && errorData.reasons.length > 0) {
                // Show detailed dependency error messages
                const errorMessage = errorData.error || "Cannot update task status";
                const reasons = errorData.reasons.join(". ");
                toast.error(`${errorMessage}: ${reasons}`);
            } else {
                toast.error(errorData?.error || "Failed to update task progress");
            }
        } finally {
            setIsUpdatingProgress(false);
        }
    };

    const isTaskOverdue = (endDate: string) => {
        return (
            new Date(endDate) < new Date() &&
            selectedTask?.status !== "completed"
        );
    };

    const getDaysUntilDue = (endDate: string) => {
        const today = new Date();
        const due = new Date(endDate);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <DashboardLayout
                    title={getPageTitle()}
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

    if (!project) {
        return (
            <ProtectedRoute>
                <DashboardLayout
                    title={getPageTitle()}
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

    return (
        <ProtectedRoute>
            <DashboardLayout
                title={getPageTitle()}
                onViewChange={setActiveView}
                activeView={activeView}
            >
                {/* Breadcrumb Navigation */}
                <div className="flex items-center space-x-2 text-sm text-muted mb-6">
                    <button
                        onClick={() => router.push("/projects")}
                        className="hover:text-bright transition-colors"
                    >
                        Projects
                    </button>
                    <span>/</span>
                    <button
                        onClick={() => router.push(`/projects/${projectId}`)}
                        className="hover:text-bright transition-colors"
                    >
                        {project.name}
                    </button>
                    <span>/</span>
                    <span className="text-ink">
                        {getPageTitle()}
                    </span>
                </div>

                {/* Page Header */}
                <div className="bg-surface border border-line rounded-xl p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                                <button
                                    onClick={() =>
                                        router.push(`/projects/${projectId}`)
                                    }
                                    className="p-2 rounded-lg text-faint hover:text-muted hover:bg-surface-2 transition-colors"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <h1 className="text-2xl font-bold text-ink">
                                    {getPageTitle()}
                                </h1>
                                <span className="px-3 py-1 bg-info-soft text-info rounded-full text-sm font-medium">
                                    {filteredTasks.length} tasks
                                </span>
                            </div>
                            <p className="text-muted mb-3">
                                {getPageDescription()}
                            </p>
                        </div>
                    </div>

                    {/* Task Statistics */}
                    <StatGrid className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                        <StatTile
                            label="Total Tasks"
                            value={tasks.length}
                            icon={<Target className="h-5 w-5" />}
                            tone="brand"
                        />
                        <StatTile
                            label="Completed"
                            value={
                                tasks.filter((task) => task.status === "completed")
                                    .length
                            }
                            icon={<CheckCircle className="h-5 w-5" />}
                            tone="success"
                        />
                        <StatTile
                            label="In Progress"
                            value={
                                tasks.filter(
                                    (task) => task.status === "in_progress",
                                ).length
                            }
                            icon={<RefreshCw className="h-5 w-5" />}
                            tone="warning"
                        />
                        <StatTile
                            label="Overdue"
                            value={
                                tasks.filter(
                                    (task) =>
                                        new Date(task.end_date) < new Date() &&
                                        task.status !== "completed",
                                ).length
                            }
                            icon={<AlertTriangle className="h-5 w-5" />}
                            tone="danger"
                        />
                        <StatTile
                            label="On Hold"
                            value={
                                tasks.filter((task) => task.status === "on_hold")
                                    .length
                            }
                            icon={<PauseCircle className="h-5 w-5" />}
                            tone="neutral"
                        />
                    </StatGrid>
                </div>

                {/* Filters and Search */}
                <div className="mb-6">
                    <FilterBar
                        search={searchQuery}
                        onSearch={setSearchQuery}
                        searchPlaceholder={
                            isTechnicalTeamMember(currentUserRole)
                                ? "Search my tasks…"
                                : "Search tasks…"
                        }
                        resultLabel={`${filteredTasks.length} ${filteredTasks.length === 1 ? "task" : "tasks"}`}
                        activeCount={
                            (statusFilter !== "all" ? 1 : 0) +
                            (priorityFilter !== "all" ? 1 : 0)
                        }
                        onClear={() => {
                            setStatusFilter("all");
                            setPriorityFilter("all");
                            setSortBy("due_date");
                            setSortOrder("asc");
                        }}
                    >
                        <FilterSelect
                            label="Status"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: "all", label: "All Status" },
                                { value: "todo", label: "To Do" },
                                { value: "in_progress", label: "In Progress" },
                                { value: "completed", label: "Completed" },
                                { value: "on_hold", label: "On Hold" },
                            ]}
                        />
                        <FilterSelect
                            label="Priority"
                            value={priorityFilter}
                            onChange={setPriorityFilter}
                            options={[
                                { value: "all", label: "All Priorities" },
                                { value: "high", label: "High Priority" },
                                { value: "medium", label: "Medium Priority" },
                                { value: "low", label: "Low Priority" },
                            ]}
                        />
                        <FilterSelect
                            label="Sort by"
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(v: string) => {
                                const [field, order] = v.split("-");
                                setSortBy(field as any);
                                setSortOrder(order as any);
                            }}
                            options={[
                                { value: "due_date-asc", label: "Due Date (Earliest)" },
                                { value: "due_date-desc", label: "Due Date (Latest)" },
                                { value: "priority-desc", label: "Priority (High to Low)" },
                                { value: "priority-asc", label: "Priority (Low to High)" },
                                { value: "progress-asc", label: "Progress (Low to High)" },
                                { value: "progress-desc", label: "Progress (High to Low)" },
                                { value: "name-asc", label: "Name (A to Z)" },
                                { value: "name-desc", label: "Name (Z to A)" },
                            ]}
                        />
                    </FilterBar>
                </div>

                {/* Tasks List */}
                <div className="space-y-4">
                    {filteredTasks.length === 0 ? (
                        <div className="bg-surface border border-line rounded-xl p-12 text-center">
                            <Target className="w-16 h-16 text-faint mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-ink mb-2">
                                {tasks.length === 0
                                    ? "No Tasks Assigned"
                                    : "No Tasks Match Your Filters"}
                            </h3>
                            <p className="text-muted mb-6">
                                {tasks.length === 0
                                    ? "You don't have any tasks assigned to you in this project yet."
                                    : "Try adjusting your search or filter criteria to find tasks."}
                            </p>
                            {tasks.length > 0 && (
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setStatusFilter("all");
                                        setPriorityFilter("all");
                                    }}
                                    className="px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredTasks
                            .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                            .map((task) => {
                            const daysUntilDue = getDaysUntilDue(task.end_date);
                            const overdue =
                                new Date(task.end_date) < new Date() &&
                                task.status !== "completed";

                            // Check task lock status based on dependencies
                            const lockStatus = getTaskLockStatus(task);
                            const canAccess =
                                canAccessLockedTask(currentUserRole);
                            const isTaskLocked =
                                lockStatus.isLocked && !canAccess;

                            // Debug logging for role checking
                            if (lockStatus.isLocked) {
                                console.log("Task locked - Role check:", {
                                    taskName: task.name,
                                    userRole: currentUserRole,
                                    canAccess: canAccess,
                                    isTaskLocked: isTaskLocked,
                                });
                            }

                            return (
                                <div
                                    onClick={() => {
                                        if (isTaskLocked) {
                                            toast.error(
                                                "This task is locked due to incomplete dependencies. Contact a Project Manager, PMO, or Administrator for access."
                                            );
                                            return; // Prevent navigation for locked tasks
                                        }
                                        router.push(
                                            `/projects/${projectId}/tasks/${task.task_id}`
                                        );
                                    }}
                                    key={task.task_id}
                                    className={`border rounded-xl p-6 transition-all duration-200 ${
                                        isTaskLocked
                                            ? "bg-surface-2  border-line  opacity-50 cursor-not-allowed relative overflow-hidden"
                                            : "bg-surface border-line hover:shadow-lg hover:border-info  hover:-translate-y-1 cursor-pointer group"
                                    }`}
                                >
                                    {/* Lock overlay for visual emphasis */}
                                    {isTaskLocked && (
                                        <div className="absolute inset-0 bg-surface-2/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl animate-pulse">
                                            <div className="text-center">
                                                <Lock className="w-10 h-10 text-muted mx-auto mb-3 animate-bounce" />
                                                <p className="text-sm font-semibold text-ink-3">
                                                    Task Locked
                                                </p>
                                                <p className="text-xs text-muted mt-1">
                                                    Dependencies Required
                                                </p>
                                                <p className="text-xs text-faint mt-2 max-w-xs mx-auto">
                                                    Contact PJM, PMO, or Admin
                                                    for access
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Lock status indicator */}
                                    {lockStatus.isLocked && (
                                        <div className="mb-4 p-3 bg-warning-soft border border-warning rounded-lg">
                                            <div className="flex items-start space-x-2">
                                                <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-warning">
                                                        {canAccess
                                                            ? "Task Dependencies Not Met"
                                                            : "Task Locked - Dependencies Required"}
                                                    </p>
                                                    <ul className="text-sm text-warning mt-1 space-y-1">
                                                        {lockStatus.reasons.map(
                                                            (reason, index) => (
                                                                <li key={index}>
                                                                    • {reason}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                    {!canAccess && (
                                                        <p className="text-xs text-warning mt-2">
                                                            Only PJM, PMO, and
                                                            Admin roles can
                                                            access locked tasks.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3
                                                    className={`text-lg font-semibold transition-colors ${
                                                        isTaskLocked
                                                            ? "text-faint "
                                                            : "text-ink group-hover:text-info "
                                                    }`}
                                                >
                                                    {task.name}
                                                </h3>
                                                {task.is_milestone && (
                                                    <span
                                                        className={`px-2 py-1 text-xs rounded-full ${
                                                            isTaskLocked
                                                                ? "bg-surface-2 text-faint  "
                                                                : "bg-accent-violet-soft text-accent-violet  "
                                                        }`}
                                                    >
                                                        Milestone
                                                    </span>
                                                )}
                                                <span
                                                    className={`${
                                                        isTaskLocked
                                                            ? "px-2 py-1 rounded-md text-xs font-medium bg-surface-2 text-faint  "
                                                            : getPriorityBadge(
                                                                  task.priority
                                                              )
                                                    }`}
                                                >
                                                    {task.priority.toUpperCase()}
                                                </span>
                                                <div
                                                    className={`flex items-center space-x-1 ${
                                                        isTaskLocked
                                                            ? "px-3 py-1 rounded-full text-sm font-medium bg-surface-2 text-faint  "
                                                            : getStatusBadge(
                                                                  task.status
                                                              )
                                                    }`}
                                                >
                                                    {getStatusIcon(task.status)}
                                                    <span>
                                                        {task.status
                                                            .replace("_", " ")
                                                            .toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <p
                                                className={`mb-3 ${
                                                    isTaskLocked
                                                        ? "text-faint "
                                                        : "text-muted"
                                                }`}
                                            >
                                                {task.description}
                                            </p>

                                            {/* Task Details Grid */}
                                            <div
                                                className={`grid grid-cols-2 md:grid-cols-4 gap-4 text-sm ${
                                                    isTaskLocked
                                                        ? "opacity-60"
                                                        : ""
                                                }`}
                                            >
                                                <div>
                                                    <span
                                                        className={`${
                                                            isTaskLocked
                                                                ? "text-faint"
                                                                : "text-muted"
                                                        }`}
                                                    >
                                                        Due Date:
                                                    </span>
                                                    <p
                                                        className={`font-medium ${
                                                            overdue
                                                                ? "text-danger"
                                                                : isTaskLocked
                                                                ? "text-faint "
                                                                : "text-ink"
                                                        }`}
                                                    >
                                                        {new Date(
                                                            task.end_date
                                                        ).toLocaleDateString()}
                                                        {overdue && (
                                                            <span className="ml-1">
                                                                (Overdue)
                                                            </span>
                                                        )}
                                                        {!overdue &&
                                                            daysUntilDue <= 3 &&
                                                            daysUntilDue >
                                                                0 && (
                                                                <span
                                                                    className={`ml-1 ${
                                                                        isTaskLocked
                                                                            ? "text-faint"
                                                                            : "text-bright"
                                                                    }`}
                                                                >
                                                                    (
                                                                    {
                                                                        daysUntilDue
                                                                    }{" "}
                                                                    days left)
                                                                </span>
                                                            )}
                                                    </p>
                                                </div>

                                                <div>
                                                    <span
                                                        className={`${
                                                            isTaskLocked
                                                                ? "text-faint"
                                                                : "text-muted"
                                                        }`}
                                                    >
                                                        Progress:
                                                    </span>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span
                                                            className={`text-sm font-medium ${
                                                                isTaskLocked
                                                                    ? "text-faint "
                                                                    : "text-ink"
                                                            }`}
                                                        >
                                                            {
                                                                task.progress_percentage
                                                            }
                                                            %
                                                        </span>
                                                        <div className="flex-1 bg-surface-3 rounded-full h-2 min-w-[60px]">
                                                            <div
                                                                className={`h-2 rounded-full transition-all duration-300 ${
                                                                    isTaskLocked
                                                                        ? "bg-surface-3 "
                                                                        : task.status ===
                                                                          "completed"
                                                                        ? "bg-success"
                                                                        : task.status ===
                                                                          "in_progress"
                                                                        ? "bg-info"
                                                                        : overdue
                                                                        ? "bg-danger"
                                                                        : "bg-faint"
                                                                }`}
                                                                style={{
                                                                    width: `${task.progress_percentage}%`,
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <span
                                                        className={`${
                                                            isTaskLocked
                                                                ? "text-faint"
                                                                : "text-muted"
                                                        }`}
                                                    >
                                                        Hours:
                                                    </span>
                                                    <p
                                                        className={`font-medium ${
                                                            isTaskLocked
                                                                ? "text-faint "
                                                                : "text-ink"
                                                        }`}
                                                    >
                                                        {task.actual_hours || 0}{" "}
                                                        / {task.estimated_hours}
                                                        h
                                                    </p>
                                                </div>

                                                <div>
                                                    <span
                                                        className={`${
                                                            isTaskLocked
                                                                ? "text-faint"
                                                                : "text-muted"
                                                        }`}
                                                    >
                                                        Work Package:
                                                    </span>
                                                    <p
                                                        className={`font-medium ${
                                                            isTaskLocked
                                                                ? "text-faint "
                                                                : "text-ink"
                                                        }`}
                                                    >
                                                        {task.work_package}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center space-x-2 ml-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isTaskLocked) {
                                                        toast.error(
                                                            "This task is locked due to incomplete dependencies. Contact a Project Manager, PMO, or Administrator for access."
                                                        );
                                                        return;
                                                    }
                                                    router.push(
                                                        `/projects/${projectId}/tasks/${task.task_id}`
                                                    );
                                                }}
                                                disabled={isTaskLocked}
                                                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                                                    isTaskLocked
                                                        ? "border border-line text-faint  cursor-not-allowed bg-surface-2"
                                                        : "border border-line text-ink-3 hover:bg-surface-2"
                                                }`}
                                            >
                                                <Eye size={16} />
                                                <span>
                                                    {isTaskLocked
                                                        ? "Locked"
                                                        : "View Details"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Task Timeline */}
                                    <div
                                        className={`mt-4 pt-4 border-t ${
                                            isTaskLocked
                                                ? "border-line "
                                                : "border-line"
                                        }`}
                                    >
                                        <div
                                            className={`flex items-center justify-between text-sm ${
                                                isTaskLocked
                                                    ? "text-faint "
                                                    : "text-muted"
                                            }`}
                                        >
                                            <span>
                                                Start:{" "}
                                                {new Date(
                                                    task.start_date
                                                ).toLocaleDateString()}
                                            </span>
                                            <span>
                                                Duration:{" "}
                                                {Math.ceil(
                                                    (new Date(
                                                        task.end_date
                                                    ).getTime() -
                                                        new Date(
                                                            task.start_date
                                                        ).getTime()) /
                                                        (1000 * 60 * 60 * 24)
                                                )}{" "}
                                                days
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {filteredTasks.length > 0 && (
                    <ListPagination
                        page={page}
                        pageCount={Math.ceil(filteredTasks.length / PAGE_SIZE)}
                        total={filteredTasks.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={setPage}
                        noun="task"
                        className="mt-6"
                    />
                )}

                {/* Progress Update Modal */}
                {showProgressModal && selectedTask && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                        }}
                        onClick={() => setShowProgressModal(false)}
                    >
                        <div
                            className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl glass-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-info-soft rounded-full flex items-center justify-center mr-4">
                                    <RefreshCw className="w-6 h-6 text-info" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-ink">
                                        Update Task Progress
                                    </h3>
                                    <p className="text-sm text-muted">
                                        {selectedTask.name}
                                    </p>
                                </div>
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(
                                        e.currentTarget
                                    );
                                    const data = Object.fromEntries(
                                        formData.entries()
                                    );
                                    submitProgressUpdate(data);
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Progress Percentage
                                    </label>
                                    <div className="relative">
                                        <input
                                            name="progress_percentage"
                                            type="number"
                                            min="0"
                                            max="100"
                                            defaultValue={
                                                selectedTask.progress_percentage
                                            }
                                            required
                                            className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent pr-8"
                                        />
                                        <span className="absolute right-3 top-2 text-sm text-muted">
                                            %
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Status
                                    </label>
                                    <select
                                        name="status"
                                        required
                                        defaultValue={selectedTask.status}
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
                                    >
                                        <option value="todo">To Do</option>
                                        <option value="in_progress">
                                            In Progress
                                        </option>
                                        <option value="completed">
                                            Completed
                                        </option>
                                        <option value="on_hold">On Hold</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ink-3 mb-1">
                                        Actual Hours (Optional)
                                    </label>
                                    <input
                                        name="actual_hours"
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        defaultValue={selectedTask.actual_hours}
                                        className="w-full px-3 py-2 border border-line rounded-lg bg-surface text-ink focus:ring-2 focus:ring-info focus:border-transparent"
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 pt-4 border-t border-line">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowProgressModal(false);
                                            setSelectedTask(null);
                                        }}
                                        disabled={isUpdatingProgress}
                                        className="px-4 py-2 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUpdatingProgress}
                                        className="px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2"
                                    >
                                        {isUpdatingProgress && (
                                            <Spinner size={16} />
                                        )}
                                        <RefreshCw size={16} />
                                        <span>
                                            {isUpdatingProgress
                                                ? "Updating..."
                                                : "Update Progress"}
                                        </span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
};

export default MyTasksPage;
