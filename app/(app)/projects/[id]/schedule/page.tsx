"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ArrowLeft, DollarSign } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import CreateTaskModal from "@/components/scheduler/taskmodal";
import ResourceAssignmentEditModal from "@/components/scheduler/ResourceAssignmentEditModal";
import CriticalPathManagementModal from "@/components/scheduler/CriticalPathModal";
import ScheduleCalendarTab from "@/components/scheduler/ScheduleCalendarTab";
import PhasesTab from "@/components/scheduler/PhasesTab";
import MilestonesTab from "@/components/scheduler/MilestonesTab";
import CriticalPathTab from "@/components/scheduler/CriticalPathTab";
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
import { Spinner } from "@/components/ui/spinner";
import { useConfirm } from "@/components/ui/confirm-provider";

const ProjectSchedulePage = () => {
    const params = useParams();
    const router = useRouter();
    const confirm = useConfirm();
    const projectId = params.id as string;

    // View and UI state
    const [activeView, setActiveView] = useState<"calendar" | "phases" | "milestones" | "critical">("calendar");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterPriority, setFilterPriority] = useState<string>("all");
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

    const handleDeleteTask = async (taskId: number, wbsId: number) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to delete tasks");
            return;
        }

        const ok = await confirm({
            title: "Delete task?",
            message:
                "Every resource assignment on this task is deleted as well. This cannot be undone.",
            confirmText: "Delete",
            tone: "danger",
        });
        if (!ok) return;

        try {
            await taskManagement.deleteTaskConfirmed(taskId, wbsId);
        } catch (error: any) {
            toast.error(error?.message || "Failed to delete task");
        }
    };

    const handleDeleteAssignment = async (assignmentId: number, taskId: number) => {
        if (!canEditSchedule()) {
            toast.error("You don't have permission to delete assignments");
            return;
        }
        const ok = await confirm({
            title: "Delete resource assignment?",
            message: "This assignment is removed from the task permanently.",
            confirmText: "Delete",
            tone: "danger",
        });
        if (!ok) return;

        try {
            await resourceManagement.deleteAssignmentConfirmed(assignmentId, taskId);
        } catch (error: any) {
            toast.error(error?.message || "Failed to delete assignment");
        }
    };

    const renderTaskAssignments = (taskId: number) => {
        const assignments = resourceManagement.allTaskAssignments[taskId] || [];

        if (resourceManagement.loadingAssignments) {
            return (
                <div className="mt-2 text-xs text-muted italic">
                    Loading assignments...
                </div>
            );
        }

        if (assignments.length === 0) {
            return (
                <div className="mt-2 text-xs text-muted italic">
                    No resources assigned
                </div>
            );
        }

        return (
            <div className="mt-3 space-y-2">
                <div className="text-xs font-medium text-muted flex items-center">
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
                    <Spinner size={64} className="text-bright-primary" />
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
                        className="flex items-center space-x-2 px-6 py-3 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors"
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
                        className="flex items-center space-x-2 px-6 py-3 bg-info text-white rounded-lg hover:opacity-90 transition-colors"
                    >
                        <span>Next: Review Budget </span>
                        <DollarSign size={18} />
                    </button>
                </div>
            )}

            {/* Month/Year Picker Modal */}
            {showMonthYearPicker && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-surface rounded-lg p-6 w-80 shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">
                            Select Month & Year
                        </h3>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {Array.from({ length: 12 }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedMonth(i)}
                                    className={`rounded p-2 text-[13px] transition-colors ${
                                        selectedMonth === i
                                            ? "bg-bright-soft font-semibold text-bright-deep"
                                            : "bg-surface-2 text-muted hover:bg-surface-3 hover:text-ink"
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
                                className="p-2 hover:bg-surface-2 rounded"
                            >
                                &lt;
                            </button>
                            <span className="text-lg font-semibold">{selectedYear}</span>
                            <button
                                onClick={() => setSelectedYear(selectedYear + 1)}
                                className="p-2 hover:bg-surface-2 rounded"
                            >
                                &gt;
                            </button>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setShowMonthYearPicker(false)}
                                className="flex-1 px-4 py-2 border border-line rounded-lg hover:bg-surface-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setCurrentMonth(new Date(selectedYear, selectedMonth));
                                    setShowMonthYearPicker(false);
                                }}
                                className="flex-1 px-4 py-2 bg-bright text-white rounded-lg hover:bg-bright-deep"
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