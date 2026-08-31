import React from "react";
import {
  Calendar, Building, CheckCircle, Clock, Target, Star, Zap, Activity,
  Edit2, Trash2, Filter, Circle, AlertTriangle
} from "lucide-react"; // or wherever your icons are
import type { Task } from "@/types/project";

interface PhasesTabProps {
  wbsItems: any[];
  tasks: Task[];
  filteredTasks: Task[];
  allTaskAssignments: Record<number, any[]>;
  searchTerm: string;
  filterStatus: string;
  filterPriority: string;
  setSearchTerm: (v: string) => void;
  setFilterStatus: (v: string) => void;
  setFilterPriority: (v: string) => void;
  canEditSchedule: () => boolean;
  handleEditTask: (task: Task) => void;
  handleDeleteTask: (taskId: number, wbsId: number) => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  renderTaskAssignments: (taskId: number) => React.ReactNode;
  formatDate: (dateString: string) => string;
  getDaysUntilDeadline: (endDate: string) => number;
}

function PhasesTab(props: PhasesTabProps){
        // Create hierarchical WBS structure with filtering support
        const createWBSHierarchy = (
            wbsList: any[],
            taskList: Task[],
            filteredTaskList: Task[]
        ) => {
            // Group WBS items by parent
            const wbsByParent: Record<number, any[]> = {};

            wbsList.forEach((wbs) => {
                const parentId = wbs.parent_wbs_id || 0;
                if (!wbsByParent[parentId]) {
                    wbsByParent[parentId] = [];
                }
                wbsByParent[parentId].push(wbs);
            });

            // Set to track WBS IDs that contain filtered tasks (directly or via children)
            const wbsWithFilteredTasks = new Set<number>();

            // First pass: identify WBS items that directly contain filtered tasks
            filteredTaskList.forEach((task) => {
                let currentWbsId = task.wbs_id;
                let currentWbs = wbsList.find(
                    (wbs) => wbs.wbs_id === currentWbsId
                );

                // Mark this WBS and all its ancestors
                while (currentWbs) {
                    wbsWithFilteredTasks.add(currentWbs.wbs_id);
                    if (!currentWbs.parent_wbs_id) break;

                    // Move up to parent
                    currentWbsId = currentWbs.parent_wbs_id;
                    currentWbs = wbsList.find(
                        (wbs) => wbs.wbs_id === currentWbsId
                    );
                }
            });

            // Build hierarchy starting from root level, filtering out items with no matching tasks
            const buildTree = (parentId: number): any[] => {
                const children = wbsByParent[parentId] || [];

                return children
                    .map((wbs) => {
                        // All tasks associated with this WBS
                        const allTasks = taskList.filter(
                            (task) => task.wbs.wbs_id === wbs.wbs_id
                        );

                        // Only filtered tasks for this WBS
                        const filteredTasks = filteredTaskList.filter(
                            (task) => task.wbs.wbs_id === wbs.wbs_id
                        );

                        // Recursively build children
                        const childNodes = buildTree(wbs.wbs_id);

                        return {
                            ...wbs,
                            tasks: allTasks, // Keep all tasks for progress calculation
                            filteredTasks: filteredTasks, // Add filtered tasks for display
                            children: childNodes,
                            hasMatchingTasks:
                                filteredTasks.length > 0 ||
                                childNodes.some(
                                    (child) =>
                                        child.hasMatchingTasks ||
                                        child.filteredTasks?.length > 0
                                ),
                        };
                    })
                    .filter((wbs) => {
                        // Show WBS if:
                        // 1. No search/filter is active (show everything) OR
                        // 2. This WBS or its descendants have matching tasks
                        const isFilterActive =
                            props?.searchTerm ||
                            props?.filterStatus !== "all" ||
                            props?.filterPriority !== "all";
                        return !isFilterActive || wbs.hasMatchingTasks;
                    });
            };

            return buildTree(0);
        };

        const hierarchicalWBS = createWBSHierarchy(
            props?.wbsItems,
            props?.tasks,
            props?.filteredTasks
        );

        const renderWBSItem = (wbs: any, level: number = 1) => {
            const indentWidth = (level - 1) * 24; // 24px per level
            const borderClass =
                level > 1
                    ? "border-l-4 border-line pl-4"
                    : "";

            // Get progress and status for this WBS item
            const allTasks = wbs.tasks || [];
            const isFilterActive =
                props?.searchTerm ||
                props?.filterStatus !== "all" ||
                props?.filterPriority !== "all";
            const tasksToDisplay = isFilterActive
                ? wbs.filteredTasks || []
                : allTasks;

            // Use the actual progress_percentage from the database (updated by cascading system)
            const progress = wbs.progress_percentage || 0;

            const completedTasks = allTasks.filter(
                (task: Task) => task.status === "completed"
            ).length;
            const inProgressTasks = allTasks.filter(
                (task: Task) => task.status === "in_progress"
            ).length;

            let status = "upcoming";
            if (completedTasks === allTasks.length && allTasks.length > 0) {
                status = "completed";
            } else if (inProgressTasks > 0 || completedTasks > 0) {
                status = "active";
            }

            // Enhanced color scheme based on level with gradients
            const colorSchemes = [
                {
                    gradient: "from-info to-info",
                    bg: "bg-info",
                    light: "bg-info-soft ",
                    border: "border-info ",
                },
                {
                    gradient: "from-success to-success",
                    bg: "bg-success",
                    light: "bg-success-soft ",
                    border: "border-success ",
                },
                {
                    gradient: "from-accent-violet to-accent-violet",
                    bg: "bg-accent-violet",
                    light: "bg-accent-violet-soft ",
                    border: "border-accent-violet ",
                },
                {
                    gradient: "from-bright to-bright-deep",
                    bg: "bg-bright",
                    light: "bg-bright-soft ",
                    border: "border-bright ",
                },
                {
                    gradient: "from-accent-pink to-accent-pink",
                    bg: "bg-accent-pink",
                    light: "bg-accent-pink-soft ",
                    border: "border-accent-pink ",
                },
                {
                    gradient: "from-accent-indigo to-accent-indigo",
                    bg: "bg-accent-indigo",
                    light: "bg-accent-indigo-soft ",
                    border: "border-accent-indigo ",
                },
            ];
            const colorScheme = colorSchemes[(level - 1) % colorSchemes.length];

            // Background intensity decreases with level
            const bgIntensity =
                level === 1
                    ? "bg-surface"
                    : level === 2
                    ? "bg-surface-2 "
                    : "bg-surface-2";

            return (
                <div
                    key={`wbs-${wbs.wbs_id}`}
                    className={`${level > 1 ? "mt-6" : "mb-8"}`}
                    style={{ marginLeft: `${indentWidth}px` }}
                >
                    <div
                        className={`${bgIntensity} rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${colorScheme.border} border-2 overflow-hidden`}
                    >
                        {/* WBS Header with Gradient */}
                        <div
                            className={`px-6 py-5 bg-gradient-to-r ${colorScheme.gradient} text-white relative overflow-hidden`}
                        >
                            {/* Decorative background pattern */}
                            <div className="absolute inset-0 bg-white/10 opacity-20"></div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                        {level > 1 && (
                                            <div className="flex items-center text-faint mr-2">
                                                <div className="text-lg">
                                                    {"└".repeat(
                                                        Math.min(level - 1, 3)
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div
                                            className={`w-3 h-3 rounded-full bg-surface shadow-md`}
                                        ></div>
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3
                                                className={`${
                                                    level === 1
                                                        ? "text-xl"
                                                        : level === 2
                                                        ? "text-lg"
                                                        : "text-base"
                                                } font-bold text-white drop-shadow-sm`}
                                            >
                                                {wbs.name}
                                            </h3>
                                            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-mono border border-white/30">
                                                {wbs.wbs_code}
                                            </span>
                                            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs border border-white/30">
                                                Level {wbs.level}
                                            </span>
                                        </div>
                                        {wbs.description && (
                                            <p className="text-sm text-white/90 drop-shadow-sm">
                                                {wbs.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 relative z-10">
                                    <div className="text-right">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <div className="text-lg font-bold text-white drop-shadow-sm">
                                                {progress.toFixed(0)}%
                                            </div>
                                            {progress === 100 && (
                                                <CheckCircle
                                                    size={18}
                                                    className="text-white"
                                                />
                                            )}
                                            {progress > 0 && progress < 100 && (
                                                <Clock
                                                    size={16}
                                                    className="text-white"
                                                />
                                            )}
                                        </div>
                                        <div className="w-24 bg-white/20 rounded-full h-3 mt-1 relative overflow-hidden">
                                            <div
                                                className={`h-3 rounded-full transition-all duration-500 shadow-sm ${
                                                    progress === 100
                                                        ? "bg-success"
                                                        : progress > 75
                                                        ? "bg-info"
                                                        : progress > 50
                                                        ? "bg-warning"
                                                        : progress > 25
                                                        ? "bg-bright"
                                                        : "bg-surface"
                                                }`}
                                                style={{
                                                    width: `${progress}%`,
                                                }}
                                            ></div>
                                            {progress > 0 && progress < 100 && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                                            )}
                                        </div>
                                        <div className="text-xs text-white/80 mt-1">
                                            {completedTasks}/{allTasks.length}{" "}
                                            tasks
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end space-y-1">
                                        <span
                                            className={`px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/30 ${
                                                status === "completed"
                                                    ? "bg-success/20 text-white"
                                                    : status === "active"
                                                    ? "bg-info/20 text-white"
                                                    : status === "delayed"
                                                    ? "bg-danger/20 text-white"
                                                    : "bg-white/20 text-white"
                                            }`}
                                        >
                                            {status.charAt(0).toUpperCase() +
                                                status.slice(1)}
                                        </span>
                                        {status === "active" &&
                                            inProgressTasks > 0 && (
                                                <div className="text-xs text-white/80 px-2 py-1 bg-white/10 rounded-full">
                                                    {inProgressTasks} in
                                                    progress
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 space-y-2 text-sm text-white/80 relative z-10">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center space-x-2">
                                        <Calendar
                                            size={14}
                                            className="opacity-80"
                                        />
                                        <span>
                                            {wbs.start_date &&
                                                props?.formatDate(wbs.start_date)}{" "}
                                            -{" "}
                                            {wbs.end_date &&
                                                props?.formatDate(wbs.end_date)}
                                        </span>
                                    </span>
                                    <span className="flex items-center space-x-2">
                                        <Target
                                            size={14}
                                            className="opacity-80"
                                        />
                                        <span>
                                            {allTasks.length} tasks
                                            {wbs.children?.length > 0
                                                ? ` • ${wbs.children.length} sub-items`
                                                : ""}
                                        </span>
                                    </span>
                                </div>

                                {/* Enhanced Progress Details */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <span className="flex items-center space-x-1">
                                            <CheckCircle
                                                size={14}
                                                className="opacity-80"
                                            />
                                            <span>
                                                {completedTasks} completed
                                            </span>
                                        </span>
                                        <span className="flex items-center space-x-1">
                                            <Clock
                                                size={14}
                                                className="opacity-80"
                                            />
                                            <span>
                                                {inProgressTasks} in progress
                                            </span>
                                        </span>
                                        <span className="flex items-center space-x-1">
                                            <Circle
                                                size={14}
                                                className="opacity-80"
                                            />
                                            <span>
                                                {allTasks.length -
                                                    completedTasks -
                                                    inProgressTasks}{" "}
                                                pending
                                            </span>
                                        </span>
                                    </div>

                                    {/* Time Status */}
                                    {wbs.end_date && (
                                        <div className="flex items-center space-x-1">
                                            {(() => {
                                                const daysUntilEnd =
                                                    props?.getDaysUntilDeadline(
                                                        wbs.end_date
                                                    );
                                                const isOverdue =
                                                    daysUntilEnd < 0 &&
                                                    progress < 100;
                                                const isNearDeadline =
                                                    daysUntilEnd <= 7 &&
                                                    daysUntilEnd > 0 &&
                                                    progress < 100;

                                                return (
                                                    <>
                                                        {isOverdue ? (
                                                            <AlertTriangle
                                                                size={14}
                                                                className="text-white"
                                                            />
                                                        ) : isNearDeadline ? (
                                                            <Clock
                                                                size={14}
                                                                className="text-white"
                                                            />
                                                        ) : (
                                                            <Calendar
                                                                size={14}
                                                                className="opacity-80"
                                                            />
                                                        )}
                                                        <span
                                                            className={`${
                                                                isOverdue
                                                                    ? "text-white"
                                                                    : isNearDeadline
                                                                    ? "text-white"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {isOverdue
                                                                ? `${Math.abs(
                                                                      daysUntilEnd
                                                                  )} days overdue`
                                                                : daysUntilEnd ===
                                                                  0
                                                                ? "Due today"
                                                                : daysUntilEnd >
                                                                  0
                                                                ? `${daysUntilEnd} days remaining`
                                                                : "Completed"}
                                                        </span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* WBS Tasks */}
                        {tasksToDisplay.length > 0 && (
                            <div className="p-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-medium text-ink-3 flex items-center">
                                            <Target
                                                size={14}
                                                className="mr-2"
                                            />
                                            Tasks in {wbs.name}
                                        </h4>
                                        <span className="text-xs text-muted">
                                            {isFilterActive
                                                ? `${
                                                      tasksToDisplay.length
                                                  } matching ${
                                                      tasksToDisplay.length ===
                                                      1
                                                          ? "task"
                                                          : "tasks"
                                                  } (of ${
                                                      allTasks.length
                                                  } total)`
                                                : `${allTasks.length} total`}
                                        </span>
                                    </div>
                                    {tasksToDisplay.map((task: Task) => (
                                        <div
                                            key={task.task_id}
                                            className={`p-5 ${colorScheme.light} rounded-xl ${colorScheme.border} border shadow-md hover:shadow-lg transition-all duration-300`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        {task.is_milestone && (
                                                            <Star
                                                                size={16}
                                                                className="text-accent-violet flex-shrink-0"
                                                            />
                                                        )}
                                                        {task.is_critical_path && (
                                                            <Zap
                                                                size={16}
                                                                className="text-bright flex-shrink-0"
                                                            />
                                                        )}
                                                        <h5 className="font-medium text-ink truncate">
                                                            {task.name}
                                                        </h5>
                                                    </div>
                                                    <div className="flex items-center space-x-4 text-sm text-muted mb-2">
                                                        <span className="flex items-center">
                                                            <Calendar
                                                                size={12}
                                                                className="mr-1"
                                                            />
                                                            {props?.formatDate(
                                                                task.start_date
                                                            )}{" "}
                                                            -{" "}
                                                            {props?.formatDate(
                                                                task.end_date
                                                            )}
                                                        </span>
                                                        <span className="flex items-center">
                                                            <Clock
                                                                size={12}
                                                                className="mr-1"
                                                            />
                                                            {task.duration} days
                                                        </span>
                                                        {task.estimated_hours >
                                                            0 && (
                                                            <span className="flex items-center">
                                                                <Activity
                                                                    size={12}
                                                                    className="mr-1"
                                                                />
                                                                {
                                                                    task.estimated_hours
                                                                }
                                                                h estimated
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <span
                                                                className={`px-2 py-1 rounded-full text-xs font-medium ${props?.getStatusColor(
                                                                    task.status
                                                                )}`}
                                                            >
                                                                {task.status.replace(
                                                                    "_",
                                                                    " "
                                                                )}
                                                            </span>
                                                            <span
                                                                className={`px-2 py-1 rounded-full text-xs font-medium ${props?.getPriorityColor(
                                                                    task.priority
                                                                )}`}
                                                            >
                                                                {task.priority}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            {props?.canEditSchedule() && (
                                                                <>
                                                                    <button
                                                                        onClick={() =>
                                                                            props?.handleEditTask(
                                                                                task
                                                                            )
                                                                        }
                                                                        className="flex items-center justify-center h-7 w-7 bg-surface-2 hover:bg-surface-3 text-ink-3 rounded-md text-xs font-medium transition-colors shadow-sm"
                                                                        title="Edit Task"
                                                                    >
                                                                        <Edit2
                                                                            size={
                                                                                12
                                                                            }
                                                                        />
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            props?.handleDeleteTask(
                                                                                task.task_id,
                                                                                task.wbs_id
                                                                            )
                                                                        }
                                                                        className="flex items-center justify-center h-7 w-7 bg-surface-2 hover:bg-danger-soft text-ink-3 hover:text-danger rounded-md text-xs font-medium transition-colors shadow-sm"
                                                                        title="Delete Task"
                                                                    >
                                                                        <Trash2
                                                                            size={
                                                                                12
                                                                            }
                                                                        />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Task Progress Bar - Allocation Based */}
                                                    <div className="mt-4 p-3 bg-surface-2 rounded-lg border">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-medium text-ink-3">
                                                                Task Progress
                                                                (Allocation-Weighted)
                                                            </span>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-lg font-bold text-ink">
                                                                    {
                                                                        task.progress_percentage
                                                                    }
                                                                    %
                                                                </span>
                                                                {task.progress_percentage ===
                                                                    100 && (
                                                                    <CheckCircle
                                                                        size={
                                                                            16
                                                                        }
                                                                        className="text-success"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="w-full bg-surface-3 rounded-full h-3 mb-2 relative overflow-hidden">
                                                            <div
                                                                className={`h-3 rounded-full transition-all duration-500 ${
                                                                    task.progress_percentage ===
                                                                    100
                                                                        ? "bg-success"
                                                                        : task.progress_percentage >=
                                                                          75
                                                                        ? "bg-info"
                                                                        : task.progress_percentage >=
                                                                          50
                                                                        ? "bg-warning"
                                                                        : task.progress_percentage >=
                                                                          25
                                                                        ? "bg-bright"
                                                                        : "bg-danger"
                                                                }`}
                                                                style={{
                                                                    width: `${task.progress_percentage}%`,
                                                                }}
                                                            ></div>

                                                            {/* Animated shimmer effect for active tasks */}
                                                            {task.progress_percentage >
                                                                0 &&
                                                                task.progress_percentage <
                                                                    100 && (
                                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                                                                )}
                                                        </div>

                                                        {/* Progress Details */}
                                                        <div className="flex items-center justify-between text-xs text-muted">
                                                            <span>
                                                                Calculated from{" "}
                                                                {props?.allTaskAssignments[
                                                                    task.task_id
                                                                ]?.length ||
                                                                    0}{" "}
                                                                resource
                                                                assignment(s)
                                                            </span>
                                                            <span>
                                                                {task.status ===
                                                                "completed"
                                                                    ? "Task Completed"
                                                                    : task.status ===
                                                                      "in_progress"
                                                                    ? "In Progress"
                                                                    : task.status ===
                                                                      "on_hold"
                                                                    ? "On Hold"
                                                                    : "Not Started"}
                                                            </span>
                                                        </div>

                                                        {/* Allocation Breakdown - Show if assignments exist */}
                                                        {props?.allTaskAssignments[
                                                            task.task_id
                                                        ] &&
                                                            props?.allTaskAssignments[
                                                                task.task_id
                                                            ].length > 0 && (
                                                                <div className="mt-3 pt-3 border-t border-line">
                                                                    <div className="text-xs font-medium text-muted mb-2">
                                                                        Allocation
                                                                        Breakdown:
                                                                    </div>
                                                                    <div className="grid grid-cols-1 gap-1">
                                                                        {props?.allTaskAssignments[
                                                                            task
                                                                                .task_id
                                                                        ].map(
                                                                            (
                                                                                assignment: any,
                                                                                index: number
                                                                            ) => {
                                                                                const individualProgress =
                                                                                    assignment.planned_hours >
                                                                                    0
                                                                                        ? Math.min(
                                                                                              100,
                                                                                              Math.round(
                                                                                                  (assignment.actual_hours /
                                                                                                      assignment.planned_hours) *
                                                                                                      100
                                                                                              )
                                                                                          )
                                                                                        : 0;

                                                                                return (
                                                                                    <div
                                                                                        key={
                                                                                            assignment.assignment_id
                                                                                        }
                                                                                        className="flex items-center justify-between text-xs"
                                                                                    >
                                                                                        <span className="text-muted truncate flex-1">
                                                                                            {
                                                                                                assignment
                                                                                                    .resource
                                                                                                    .name
                                                                                            }{" "}
                                                                                            (
                                                                                            {
                                                                                                assignment.allocation_percentage
                                                                                            }
                                                                                            %)
                                                                                        </span>
                                                                                        <div className="flex items-center space-x-2 ml-2">
                                                                                            <span
                                                                                                className={`${
                                                                                                    individualProgress ===
                                                                                                    100
                                                                                                        ? "text-success font-medium"
                                                                                                        : "text-muted"
                                                                                                }`}
                                                                                            >
                                                                                                {
                                                                                                    assignment.actual_hours
                                                                                                }
                                                                                                h/
                                                                                                {
                                                                                                    assignment.planned_hours
                                                                                                }

                                                                                                h
                                                                                            </span>
                                                                                            <div className="w-12 bg-surface-3 rounded-full h-1">
                                                                                                <div
                                                                                                    className={`h-1 rounded-full ${
                                                                                                        individualProgress ===
                                                                                                        100
                                                                                                            ? "bg-success"
                                                                                                            : "bg-info"
                                                                                                    }`}
                                                                                                    style={{
                                                                                                        width: `${individualProgress}%`,
                                                                                                    }}
                                                                                                ></div>
                                                                                            </div>
                                                                                            <span className="text-muted w-8 text-right">
                                                                                                {
                                                                                                    individualProgress
                                                                                                }

                                                                                                %
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                        )}
                                                                    </div>

                                                                    {/* Weighted Formula Explanation */}
                                                                    <div className="mt-2 p-2 bg-info-soft rounded text-xs text-info">
                                                                        <div className="font-medium mb-1">
                                                                            How
                                                                            progress
                                                                            is
                                                                            calculated:
                                                                        </div>
                                                                        <div>
                                                                            Progress
                                                                            = (Σ
                                                                            actual_hours
                                                                            ×
                                                                            allocation%)
                                                                            / (Σ
                                                                            planned_hours
                                                                            ×
                                                                            allocation%)
                                                                        </div>
                                                                        {props?.allTaskAssignments[
                                                                            task
                                                                                .task_id
                                                                        ]
                                                                            .length >
                                                                            0 && (
                                                                            <div className="mt-1 text-info">
                                                                                Example:
                                                                                If
                                                                                50%
                                                                                allocated
                                                                                resource
                                                                                finishes
                                                                                →
                                                                                contributes
                                                                                50%
                                                                                to
                                                                                task
                                                                                progress
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                    </div>

                                                    {props?.renderTaskAssignments(
                                                        task.task_id
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Show message if WBS has tasks but none match the current filter */}
                        {isFilterActive &&
                            tasksToDisplay.length === 0 &&
                            allTasks.length > 0 && (
                                <div className="p-6 text-center">
                                    <div className="p-4 bg-info-soft border border-info rounded-md">
                                        <Filter
                                            size={24}
                                            className="mx-auto mb-3 text-info"
                                        />
                                        <p className="text-sm font-medium text-info">
                                            No matching tasks in this WBS
                                        </p>
                                        <p className="text-xs text-info mt-1">
                                            This WBS has {allTasks.length} total
                                            tasks that don't match your current
                                            filters
                                        </p>
                                    </div>
                                </div>
                            )}

                        {/* Show message if WBS has no tasks but has children */}
                        {!isFilterActive &&
                            allTasks.length === 0 &&
                            wbs.children?.length > 0 && (
                                <div className="p-6 text-center text-muted">
                                    <Building
                                        size={32}
                                        className="mx-auto mb-2 opacity-50"
                                    />
                                    <p className="text-sm">
                                        This WBS item contains{" "}
                                        {wbs.children.length} sub-items with
                                        their own tasks
                                    </p>
                                </div>
                            )}

                        {/* Show message if WBS has no tasks and no children */}
                        {!isFilterActive &&
                            allTasks.length === 0 &&
                            (!wbs.children || wbs.children.length === 0) && (
                                <div className="p-6 text-center text-muted">
                                    <Target
                                        size={32}
                                        className="mx-auto mb-2 opacity-50"
                                    />
                                    <p className="text-sm">
                                        No tasks assigned to this WBS item
                                    </p>
                                </div>
                            )}
                    </div>

                    {/* Render Children WBS Items */}
                    {wbs.children && wbs.children.length > 0 && (
                        <div className="mt-4 space-y-4">
                            {wbs.children.map((child: any) =>
                                renderWBSItem(child, level + 1)
                            )}
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="space-y-6">
                {/* Filter status indicator */}
                {(props?.searchTerm ||
                    props?.filterStatus !== "all" ||
                    props?.filterPriority !== "all") && (
                    <div className="bg-info-soft border border-info rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Filter
                                    size={18}
                                    className="text-info"
                                />
                                <h3 className="text-sm font-medium text-info">
                                    Filtered View
                                </h3>
                            </div>
                            <div className="text-xs text-info">
                                {(() => {
                                    const filters = [];
                                    if (props?.searchTerm)
                                        filters.push(`Search: "${props.searchTerm}"`);
                                    if (props?.filterStatus !== "all")
                                        filters.push(
                                            `Status: ${props.filterStatus.replace(
                                                "_",
                                                " "
                                            )}`
                                        );
                                    if (props?.filterPriority !== "all")
                                        filters.push(
                                            `Priority: ${props?.filterPriority}`
                                        );
                                    return filters.join(" • ");
                                })()}
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-info">
                            Only showing WBS items containing tasks that match
                            your filters.
                            {hierarchicalWBS.length === 0 &&
                                " No matching WBS items found."}
                        </p>
                    </div>
                )}

                {hierarchicalWBS.length > 0 ? (
                    hierarchicalWBS.map((wbs) => renderWBSItem(wbs, 1))
                ) : props?.wbsItems.length > 0 ? (
                    <div className="text-center py-16 px-6">
                        <div className="p-8 max-w-md mx-auto bg-surface rounded-lg shadow-sm border border-line">
                            <Building
                                size={48}
                                className="mx-auto mb-6 text-faint"
                            />
                            <h3 className="text-xl font-semibold mb-3 text-ink-2">
                                No Matching Results
                            </h3>
                            <p className="text-muted">
                                No items match your current search criteria. Try
                                adjusting your filters or search terms.
                            </p>
                            {(props?.searchTerm ||
                                props?.filterStatus !== "all" ||
                                props?.filterPriority !== "all") && (
                                <button
                                    onClick={() => {
                                        props?.setSearchTerm("");
                                        props?.setFilterStatus("all");
                                        props?.setFilterPriority("all");
                                    }}
                                    className="mt-4 px-4 py-2 bg-info hover:opacity-90 text-white rounded-md text-sm font-medium transition-colors"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 px-6">
                        <div className="p-8 max-w-md mx-auto bg-surface rounded-lg shadow-sm border border-line">
                            <Building
                                size={48}
                                className="mx-auto mb-6 text-faint"
                            />
                            <h3 className="text-xl font-semibold mb-3 text-ink-2">
                                No WBS Structure Found
                            </h3>
                            <p className="text-muted">
                                Create WBS (Work Breakdown Structure) items to
                                organize your project structure and tasks.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    };
export default PhasesTab;