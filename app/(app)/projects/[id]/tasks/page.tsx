"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    ArrowLeft,
    Search,
    Filter,
    Calendar,
    Clock,
    Target,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
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
    const [showFilters, setShowFilters] = useState(false);

    // Progress modal states
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

    // Check if we're in dark mode
    const isDarkMode =
        typeof window !== "undefined" &&
        document.documentElement.classList.contains("dark");

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
    }, [tasks, searchQuery, statusFilter, priorityFilter, sortBy, sortOrder]);

    const getStatusBadge = (status: string) => {
        const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
        switch (status) {
            case "todo":
                return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
            case "in_progress":
                return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
            case "completed":
                return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
            case "on_hold":
                return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
            default:
                return baseClasses;
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
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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

    return (
        <ProtectedRoute>
            <DashboardLayout
                title={getPageTitle()}
                onViewChange={setActiveView}
                activeView={activeView}
            >
                {/* Breadcrumb Navigation */}
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                    <button
                        onClick={() => router.push("/projects")}
                        className="hover:text-orange-600 transition-colors"
                    >
                        Projects
                    </button>
                    <span>/</span>
                    <button
                        onClick={() => router.push(`/projects/${projectId}`)}
                        className="hover:text-orange-600 transition-colors"
                    >
                        {project.name}
                    </button>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-gray-100">
                        {getPageTitle()}
                    </span>
                </div>

                {/* Page Header */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                                <button
                                    onClick={() =>
                                        router.push(`/projects/${projectId}`)
                                    }
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {getPageTitle()}
                                </h1>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full text-sm font-medium">
                                    {filteredTasks.length} tasks
                                </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                                {getPageDescription()}
                            </p>
                        </div>
                    </div>

                    {/* Task Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                        Total Tasks
                                    </p>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                        {tasks.length}
                                    </p>
                                </div>
                                <Target className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                        Completed
                                    </p>
                                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                        {
                                            tasks.filter(
                                                (task) =>
                                                    task.status === "completed"
                                            ).length
                                        }
                                    </p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                                        In Progress
                                    </p>
                                    <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                                        {
                                            tasks.filter(
                                                (task) =>
                                                    task.status ===
                                                    "in_progress"
                                            ).length
                                        }
                                    </p>
                                </div>
                                <RefreshCw className="w-8 h-8 text-yellow-500" />
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                        Overdue
                                    </p>
                                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                                        {
                                            tasks.filter(
                                                (task) =>
                                                    new Date(task.end_date) <
                                                        new Date() &&
                                                    task.status !== "completed"
                                            ).length
                                        }
                                    </p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        {/* Search */}
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder={
                                        isTechnicalTeamMember(currentUserRole)
                                            ? "Search my tasks..."
                                            : "Search tasks..."
                                    }
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Filters and Sort */}
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                                    showFilters
                                        ? "bg-blue-600 text-white"
                                        : "border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                }`}
                            >
                                <Filter size={16} />
                                <span>Filters</span>
                            </button>

                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => {
                                    const [field, order] =
                                        e.target.value.split("-");
                                    setSortBy(field as any);
                                    setSortOrder(order as any);
                                }}
                                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="due_date-asc">
                                    Due Date (Earliest)
                                </option>
                                <option value="due_date-desc">
                                    Due Date (Latest)
                                </option>
                                <option value="priority-desc">
                                    Priority (High to Low)
                                </option>
                                <option value="priority-asc">
                                    Priority (Low to High)
                                </option>
                                <option value="progress-asc">
                                    Progress (Low to High)
                                </option>
                                <option value="progress-desc">
                                    Progress (High to Low)
                                </option>
                                <option value="name-asc">Name (A to Z)</option>
                                <option value="name-desc">Name (Z to A)</option>
                            </select>
                        </div>
                    </div>

                    {/* Filter Options */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) =>
                                            setStatusFilter(e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="all">All Status</option>
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Priority
                                    </label>
                                    <select
                                        value={priorityFilter}
                                        onChange={(e) =>
                                            setPriorityFilter(e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="all">
                                            All Priorities
                                        </option>
                                        <option value="high">
                                            High Priority
                                        </option>
                                        <option value="medium">
                                            Medium Priority
                                        </option>
                                        <option value="low">
                                            Low Priority
                                        </option>
                                    </select>
                                </div>

                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            setSearchQuery("");
                                            setStatusFilter("all");
                                            setPriorityFilter("all");
                                            setSortBy("due_date");
                                            setSortOrder("asc");
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tasks List */}
                <div className="space-y-4">
                    {filteredTasks.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-12 text-center">
                            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                {tasks.length === 0
                                    ? "No Tasks Assigned"
                                    : "No Tasks Match Your Filters"}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
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
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredTasks.map((task) => {
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
                                            ? "bg-gray-50 dark:bg-slate-900/50 border-gray-300 dark:border-slate-700/50 opacity-50 cursor-not-allowed relative overflow-hidden"
                                            : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-1 cursor-pointer group"
                                    }`}
                                >
                                    {/* Lock overlay for visual emphasis */}
                                    {isTaskLocked && (
                                        <div className="absolute inset-0 bg-gray-100/90 dark:bg-slate-800/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl animate-pulse">
                                            <div className="text-center">
                                                <Lock className="w-10 h-10 text-gray-500 dark:text-gray-400 mx-auto mb-3 animate-bounce" />
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Task Locked
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                    Dependencies Required
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 max-w-xs mx-auto">
                                                    Contact PJM, PMO, or Admin
                                                    for access
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Lock status indicator */}
                                    {lockStatus.isLocked && (
                                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                            <div className="flex items-start space-x-2">
                                                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                                        {canAccess
                                                            ? "Task Dependencies Not Met"
                                                            : "Task Locked - Dependencies Required"}
                                                    </p>
                                                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                                                        {lockStatus.reasons.map(
                                                            (reason, index) => (
                                                                <li key={index}>
                                                                    • {reason}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                    {!canAccess && (
                                                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
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
                                                            ? "text-gray-400 dark:text-gray-600"
                                                            : "text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                                    }`}
                                                >
                                                    {task.name}
                                                </h3>
                                                {task.is_milestone && (
                                                    <span
                                                        className={`px-2 py-1 text-xs rounded-full ${
                                                            isTaskLocked
                                                                ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
                                                                : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                                                        }`}
                                                    >
                                                        Milestone
                                                    </span>
                                                )}
                                                <span
                                                    className={`${
                                                        isTaskLocked
                                                            ? "px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
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
                                                            ? "px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
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
                                                        ? "text-gray-400 dark:text-gray-600"
                                                        : "text-gray-600 dark:text-gray-400"
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
                                                                ? "text-gray-400"
                                                                : "text-gray-500"
                                                        }`}
                                                    >
                                                        Due Date:
                                                    </span>
                                                    <p
                                                        className={`font-medium ${
                                                            overdue
                                                                ? "text-red-600"
                                                                : isTaskLocked
                                                                ? "text-gray-400 dark:text-gray-600"
                                                                : "text-gray-900 dark:text-gray-100"
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
                                                                            ? "text-gray-400"
                                                                            : "text-orange-600"
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
                                                                ? "text-gray-400"
                                                                : "text-gray-500"
                                                        }`}
                                                    >
                                                        Progress:
                                                    </span>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <span
                                                            className={`text-sm font-medium ${
                                                                isTaskLocked
                                                                    ? "text-gray-400 dark:text-gray-600"
                                                                    : "text-gray-900 dark:text-gray-100"
                                                            }`}
                                                        >
                                                            {
                                                                task.progress_percentage
                                                            }
                                                            %
                                                        </span>
                                                        <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2 min-w-[60px]">
                                                            <div
                                                                className={`h-2 rounded-full transition-all duration-300 ${
                                                                    isTaskLocked
                                                                        ? "bg-gray-300 dark:bg-gray-600"
                                                                        : task.status ===
                                                                          "completed"
                                                                        ? "bg-green-500"
                                                                        : task.status ===
                                                                          "in_progress"
                                                                        ? "bg-blue-500"
                                                                        : overdue
                                                                        ? "bg-red-500"
                                                                        : "bg-gray-400"
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
                                                                ? "text-gray-400"
                                                                : "text-gray-500"
                                                        }`}
                                                    >
                                                        Hours:
                                                    </span>
                                                    <p
                                                        className={`font-medium ${
                                                            isTaskLocked
                                                                ? "text-gray-400 dark:text-gray-600"
                                                                : "text-gray-900 dark:text-gray-100"
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
                                                                ? "text-gray-400"
                                                                : "text-gray-500"
                                                        }`}
                                                    >
                                                        Work Package:
                                                    </span>
                                                    <p
                                                        className={`font-medium ${
                                                            isTaskLocked
                                                                ? "text-gray-400 dark:text-gray-600"
                                                                : "text-gray-900 dark:text-gray-100"
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
                                                        ? "border border-gray-200 dark:border-slate-600 text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-slate-800"
                                                        : "border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
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
                                                ? "border-gray-200 dark:border-slate-800"
                                                : "border-gray-200 dark:border-slate-700"
                                        }`}
                                    >
                                        <div
                                            className={`flex items-center justify-between text-sm ${
                                                isTaskLocked
                                                    ? "text-gray-400 dark:text-gray-600"
                                                    : "text-gray-500"
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
                            className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
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
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4">
                                    <RefreshCw className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        Update Task Progress
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                                        />
                                        <span className="absolute right-3 top-2 text-sm text-gray-500">
                                            %
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Status
                                    </label>
                                    <select
                                        name="status"
                                        required
                                        defaultValue={selectedTask.status}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Actual Hours (Optional)
                                    </label>
                                    <input
                                        name="actual_hours"
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        defaultValue={selectedTask.actual_hours}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowProgressModal(false);
                                            setSelectedTask(null);
                                        }}
                                        disabled={isUpdatingProgress}
                                        className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUpdatingProgress}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                                    >
                                        {isUpdatingProgress && (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
