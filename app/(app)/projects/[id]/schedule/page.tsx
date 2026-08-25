"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ArrowLeft, DollarSign, X } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import TaskTemplateManager from "@/components/TaskTemplateManager";
import CreateTaskModal from "@/components/scheduler/taskmodal";
import ResourceAssignmentEditModal from "@/components/scheduler/ResourceAssignmentEditModal";
import CriticalPathManagementModal from "@/components/scheduler/CriticalPathModal";
import ScheduleCalendarTab from "@/components/scheduler/ScheduleCalendarTab";
import PhasesTab from "@/components/scheduler/PhasesTab";
import MilestonesTab from "@/components/scheduler/MilestonesTab";
import CriticalPathTab from "@/components/scheduler/CriticalPathTab";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import ProjectScheduleHeader from "@/components/scheduler/ProjectScheduleHeader";
import StatCards from "@/components/scheduler/StatCards";
import ViewTabs from "@/components/scheduler/ViewTabs";
import ScheduleFilters from "@/components/scheduler/ScheduleFilters";
import ResourceAssignmentCard from "@/components/scheduler/ResourceAssignmentCard";

// Hooks
import { useProjectSchedule } from "@/hooks/useProjectSchedule";
import { useTaskManagement } from "@/hooks/useTaskManagement";
import { useResourceAssignments } from "@/hooks/useResourceAssignments";
import { useWBSProgress } from "@/hooks/useWBSProgress";
import { usePermissions } from "@/hooks/usePermissions";

// Utils
import { filterTasks } from "@/components/scheduler/taskHelpers";
import {
    formatDate,
    getDaysUntilDeadline,
    getStatusColor,
    getPriorityColor,
} from "@/components/scheduler/taskHelpers";

const ProjectSchedulePage = () => {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    // View and UI state
    const [activeView, setActiveView] = useState<"calendar" | "phases" | "milestones" | "critical">("calendar");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterPriority, setFilterPriority] = useState<string>("all");
    const [showTaskTemplateManager, setShowTaskTemplateManager] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [showNavButtons, setShowNavButtons] = useState(false);

    // Critical path states
    const [calculatingCriticalPath, setCalculatingCriticalPath] = useState(false);
    const [criticalPathCalculated, setCriticalPathCalculated] = useState(false);
    const [criticalPathError, setCriticalPathError] = useState<string | null>(null);
    const [showCriticalPathModal, setShowCriticalPathModal] = useState(false);
    const [criticalPathRisks, setCriticalPathRisks] = useState<any[]>([]);
    const [criticalPathActions, setCriticalPathActions] = useState<any[]>([]);

    // Dialog state
    const [dialog, setDialog] = useState<{
        open: boolean;
        title?: string;
        message?: string;
        confirmText?: string;
        cancelText?: string;
        loading?: boolean;
        error?: string | null;
        iconType?: "warning" | "delete" | "success";
        onConfirm?: () => void;
        onCancel?: () => void;
    }>({ open: false });
    const [deleteDialogLoading, setDeleteDialogLoading] = useState(false);
    const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null);

    // Custom Hooks
    const { user, canEditSchedule, canViewLockedTasks } = usePermissions();

    const {
        project,
        tasks,
        loading,
        wbsItems,
        setup,
        fetchProjectData,
        fetchTasksData,
    } = useProjectSchedule(projectId);

    const { updateWBSProgressAndParents, checkAndUpdateTaskCompletion } =
        useWBSProgress({ projectId });

    const taskManagement = useTaskManagement({
        updateWBSProgressAndParents,
        fetchTasksData,
        canEditSchedule,
    });

    const resourceManagement = useResourceAssignments({
        tasks,
        checkAndUpdateTaskCompletion,
        canEditSchedule,
    });

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const from = params.get("from");
            setShowNavButtons(from === "previous");
        }
    }, []);

    const handleBackButton = () => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const from = params.get("from");
            if (from === "setup" || from === "previous") {
                router.push(`/projects/${projectId}/setup`);
            } else {
                router.push(`/projects/${projectId}`);
            }
        }
    };

    const showConfirmDialog = (options: {
        title?: string;
        message?: string;
        confirmText?: string;
        cancelText?: string;
        iconType?: "warning" | "delete" | "success";
        onConfirm?: () => void;
        onCancel?: () => void;
    }) => {
        setDialog({
            open: true,
            ...options,
            onCancel: () => {
                setDialog((prev) => ({ ...prev, open: false }));
                options.onCancel?.();
            },
            onConfirm: options.onConfirm,
        });
    };

    const handleDeleteTask = (taskId: number, wbsId: number) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to delete tasks");
            return;
        }

        showConfirmDialog({
            title: "Delete Task",
            message:
                "Are you sure you want to delete this task? This will also delete all its assignments.",
            confirmText: "Delete",
            cancelText: "Cancel",
            iconType: "delete",
            onConfirm: async () => {
                setDeleteDialogLoading(true);
                setDeleteDialogError(null);
                try {
                    await taskManagement.deleteTaskConfirmed(taskId, wbsId);
                } catch (error: any) {
                    setDeleteDialogError(error?.message || "Failed to delete task");
                    return;
                } finally {
                    setDeleteDialogLoading(false);
                    setDialog((prev) => ({ ...prev, open: false }));
                }
            },
            onCancel: () => {
                setDialog((prev) => ({ ...prev, open: false }));
            },
        });
    };

    const handleDeleteAssignment = (assignmentId: number, taskId: number) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to delete assignments");
            return;
        }
        showConfirmDialog({
            title: "Delete Resource Assignment",
            message:
                "Are you sure you want to delete this resource assignment? This action cannot be undone.",
            confirmText: "Delete",
            cancelText: "Cancel",
            iconType: "delete",
            onConfirm: () =>
                resourceManagement.deleteAssignmentConfirmed(assignmentId, taskId),
        });
    };

    const renderTaskAssignments = (taskId: number) => {
        const assignments = resourceManagement.allTaskAssignments[taskId] || [];

        if (resourceManagement.loadingAssignments) {
            return (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                    Loading assignments...
                </div>
            );
        }

        if (assignments.length === 0) {
            return (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                    No resources assigned
                </div>
            );
        }

        return (
            <div className="mt-3 space-y-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center">
                    Assigned Resources:
                </div>
                <div className="space-y-2">
                    {assignments.map((assignment) => (
                        <ResourceAssignmentCard
                            key={assignment.assignment_id}
                            assignment={assignment}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const filteredTasks = filterTasks(tasks, searchTerm, filterStatus, filterPriority);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Schedule">
            <div className="space-y-6">
                {/* Header */}
                <ProjectScheduleHeader
                    project={project}
                    user={user}
                    canEditSchedule={canEditSchedule()}
                    onBack={handleBackButton}
                    onCreateTask={() => taskManagement.setShowCreateModal(true)}
                    onUploadTasks={() => setShowTaskTemplateManager(true)}
                />

                {/* Stats Cards */}
                <StatCards tasks={tasks} filteredTasks={filteredTasks} />

                {/* View Tabs */}
                <ViewTabs activeView={activeView} onViewChange={setActiveView} />

                {/* Filters */}
                <ScheduleFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    filterPriority={filterPriority}
                    setFilterPriority={setFilterPriority}
                    tasksCount={tasks.length}
                    filteredCount={filteredTasks.length}
                />

                {/* Content Views */}
                {activeView === "calendar" && (
                    <ScheduleCalendarTab
                        currentMonth={currentMonth}
                        setCurrentMonth={setCurrentMonth}
                        showMonthYearPicker={showMonthYearPicker}
                        setShowMonthYearPicker={setShowMonthYearPicker}
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                        selectedYear={selectedYear}
                        setSelectedYear={setSelectedYear}
                        tasks={tasks}
                        filteredTasks={filteredTasks}
                        wbsItems={wbsItems}
                        project={project}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        filterPriority={filterPriority}
                        setFilterPriority={setFilterPriority}
                    />
                )}
                {activeView === "phases" && (
                    <PhasesTab
                        wbsItems={wbsItems}
                        tasks={tasks}
                        filteredTasks={filteredTasks}
                        allTaskAssignments={resourceManagement.allTaskAssignments}
                        searchTerm={searchTerm}
                        filterStatus={filterStatus}
                        filterPriority={filterPriority}
                        setSearchTerm={setSearchTerm}
                        setFilterStatus={setFilterStatus}
                        setFilterPriority={setFilterPriority}
                        canEditSchedule={canEditSchedule}
                        handleEditTask={taskManagement.handleEditTask}
                        handleDeleteTask={handleDeleteTask}
                        getStatusColor={getStatusColor}
                        getPriorityColor={getPriorityColor}
                        renderTaskAssignments={renderTaskAssignments}
                        formatDate={formatDate}
                        getDaysUntilDeadline={getDaysUntilDeadline}
                    />
                )}
                {activeView === "milestones" && (
                    <MilestonesTab
                        filteredTasks={filteredTasks}
                        handleEditTask={taskManagement.handleEditTask}
                        handleDeleteTask={handleDeleteTask}
                        getDaysUntilDeadline={getDaysUntilDeadline}
                        formatDate={formatDate}
                        getPriorityColor={getPriorityColor}
                        renderTaskAssignments={renderTaskAssignments}
                    />
                )}
                {activeView === "critical" && (
                    <CriticalPathTab
                        filteredTasks={filteredTasks}
                        tasks={tasks}
                        allTaskAssignments={resourceManagement.allTaskAssignments}
                        calculatingCriticalPath={calculatingCriticalPath}
                        criticalPathError={criticalPathError}
                        criticalPathRisks={criticalPathRisks}
                        criticalPathActions={criticalPathActions}
                        setCalculatingCriticalPath={setCalculatingCriticalPath}
                        setCriticalPathError={setCriticalPathError}
                        setCriticalPathRisks={setCriticalPathRisks}
                        setCriticalPathActions={setCriticalPathActions}
                        setCriticalPathCalculated={setCriticalPathCalculated}
                        setShowCriticalPathModal={setShowCriticalPathModal}
                        fetchProjectData={fetchProjectData}
                        getDaysUntilDeadline={getDaysUntilDeadline}
                        getStatusColor={getStatusColor}
                        getPriorityColor={getPriorityColor}
                        renderTaskAssignments={renderTaskAssignments}
                        formatDate={formatDate}
                        projectId={projectId}
                        toast={toast}
                    />
                )}
            </div>

            {/* Modals */}
            {taskManagement.showCreateModal && (
                <CreateTaskModal
                    mode="create"
                    onClose={() => taskManagement.setShowCreateModal(false)}
                    onSave={taskManagement.handleCreateTask as (data: any) => Promise<any>}
                    wbsItems={wbsItems}
                    creating={taskManagement.creating}
                    tasks={tasks}
                    setup={setup}
                />
            )}

            {taskManagement.showEditTaskModal && taskManagement.editingTask && (
                <CreateTaskModal
                    mode="edit"
                    task={taskManagement.editingTask}
                    onClose={() => taskManagement.setShowEditTaskModal(false)}
                    onSave={taskManagement.handleUpdateTask}
                    wbsItems={wbsItems}
                    setup={setup}
                    creating={taskManagement.isUpdatingTask}
                    tasks={tasks}
                />
            )}

            {showTaskTemplateManager && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    Task Template Manager
                                </h2>
                                <button
                                    onClick={() => setShowTaskTemplateManager(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <TaskTemplateManager
                                projectId={parseInt(projectId)}
                                onTasksCreated={() => {
                                    setShowTaskTemplateManager(false);
                                    fetchTasksData();
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {resourceManagement.showEditAssignmentModal &&
                resourceManagement.editingAssignment && (
                    <ResourceAssignmentEditModal
                        assignment={resourceManagement.editingAssignment}
                        resources={resourceManagement.resources}
                        task={
                            tasks.find(
                                (t) =>
                                    t.task_id ===
                                    resourceManagement.editingAssignment.task_id
                            )!
                        }
                        existingAssignments={
                            resourceManagement.allTaskAssignments[
                                resourceManagement.editingAssignment.task_id
                            ] || []
                        }
                        onClose={() => {
                            resourceManagement.setShowEditAssignmentModal(false);
                            resourceManagement.setEditingAssignment(null);
                        }}
                        onSave={resourceManagement.handleUpdateAssignment}
                    />
                )}

            {dialog?.open && (
                <ConfirmationDialog
                    open={dialog.open}
                    title={dialog.title}
                    message={dialog.message}
                    confirmText={dialog.confirmText}
                    cancelText={dialog.cancelText}
                    iconType={dialog.iconType}
                    onConfirm={dialog.onConfirm}
                    onCancel={dialog.onCancel}
                    loading={deleteDialogLoading}
                    error={deleteDialogError}
                />
            )}

            {showCriticalPathModal && (
                <CriticalPathManagementModal
                    risks={criticalPathRisks}
                    actions={criticalPathActions}
                    onClose={() => setShowCriticalPathModal(false)}
                    onAction={(action, tasks) => {
                        console.log("Critical path action:", action, tasks);
                        switch (action.type) {
                            case "assign_resources":
                                if (tasks.length > 0) {
                                    setShowCriticalPathModal(false);
                                    toast.success(
                                        `Opening resource assignment for ${tasks[0].name}`
                                    );
                                }
                                break;
                            case "breakdown":
                                toast.success(
                                    `Consider breaking down ${tasks.length} long tasks into smaller subtasks`
                                );
                                break;
                            case "accelerate":
                                toast.success(
                                    `Add resources or overtime to accelerate ${tasks.length} slow tasks`
                                );
                                break;
                            case "prepare":
                                toast.success(
                                    `Ensure resources and materials are ready for ${tasks.length} upcoming tasks`
                                );
                                break;
                            case "monitor_dependencies":
                                toast.success(
                                    `Track all dependent tasks to prevent delays on ${tasks.length} high-dependency tasks`
                                );
                                break;
                            case "emergency_recovery":
                                toast.error(
                                    `EMERGENCY: ${tasks.length} critical tasks are overdue! Implement recovery plan immediately.`
                                );
                                break;
                            default:
                                toast.info(
                                    `Action: ${action.title} for ${tasks.length} tasks`
                                );
                        }
                    }}
                />
            )}

            {/* Navigation Buttons */}
            {showNavButtons && (
                <div className="mt-6 flex justify-between">
                    <button
                        onClick={() => router.push(`/projects/${projectId}/setup`)}
                        className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Setup</span>
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                await axios.patch(
                                    `/api/projects/${projectId}/setup`,
                                    { schedule: true },
                                    {
                                        headers: {
                                            "Content-Type": "application/json",
                                            Authorization: `Bearer ${localStorage.getItem(
                                                "token"
                                            )}`,
                                        },
                                    }
                                );
                                router.push(
                                    `/projects/${projectId}/budget?from=previous`
                                );
                            } catch (error) {
                                toast.error("Failed to mark schedule as complete.");
                            }
                        }}
                        className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <span>Next: Review Budget </span>
                        <DollarSign size={18} />
                    </button>
                </div>
            )}

            {/* Month/Year Picker Modal */}
            {showMonthYearPicker && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-80 shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">
                            Select Month & Year
                        </h3>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {Array.from({ length: 12 }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedMonth(i)}
                                    className={`p-2 rounded ${
                                        selectedMonth === i
                                            ? "bg-orange-500 text-white"
                                            : "bg-gray-100 hover:bg-gray-200"
                                    }`}
                                >
                                    {new Date(2024, i).toLocaleDateString("en-US", {
                                        month: "short",
                                    })}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setSelectedYear(selectedYear - 1)}
                                className="p-2 hover:bg-gray-100 rounded"
                            >
                                &lt;
                            </button>
                            <span className="text-lg font-semibold">{selectedYear}</span>
                            <button
                                onClick={() => setSelectedYear(selectedYear + 1)}
                                className="p-2 hover:bg-gray-100 rounded"
                            >
                                &gt;
                            </button>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setShowMonthYearPicker(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setCurrentMonth(new Date(selectedYear, selectedMonth));
                                    setShowMonthYearPicker(false);
                                }}
                                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default ProjectSchedulePage;