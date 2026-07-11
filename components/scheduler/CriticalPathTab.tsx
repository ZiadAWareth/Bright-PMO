import React from "react";
import {
  Zap, RotateCcw, AlertTriangle, CheckCircle
} from "lucide-react";
import type { Task } from "@/types/project";

interface CriticalPathTabProps {
  filteredTasks: Task[];
  tasks: Task[];
  allTaskAssignments: Record<number, any[]>;
  calculatingCriticalPath: boolean;
  criticalPathError: string | null;
  criticalPathRisks: any[];
  criticalPathActions: any[];
  setCalculatingCriticalPath: (v: boolean) => void;
  setCriticalPathError: (v: string | null) => void;
  setCriticalPathRisks: (v: any[]) => void;
  setCriticalPathActions: (v: any[]) => void;
  setCriticalPathCalculated: (v: boolean) => void;
  setShowCriticalPathModal: (v: boolean) => void;
  fetchProjectData: () => Promise<void>;
  getDaysUntilDeadline: (date: string) => number;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  renderTaskAssignments: (taskId: number) => React.ReactNode;
  formatDate: (date: string) => string;
  projectId: string;
  toast: any; // If using a toast library, pass it as prop or import directly
}
const CriticalPathTab: React.FC<CriticalPathTabProps> = ({
  filteredTasks,
  tasks,
  allTaskAssignments,
  calculatingCriticalPath,
  criticalPathError,
  criticalPathRisks,
  criticalPathActions,
  setCalculatingCriticalPath,
  setCriticalPathError,
  setCriticalPathRisks,
  setCriticalPathActions,
  setCriticalPathCalculated,
  setShowCriticalPathModal,
  fetchProjectData,
  getDaysUntilDeadline,
  getStatusColor,
  getPriorityColor,
  renderTaskAssignments,
  formatDate,
  projectId,
  toast,
}) => {
        const criticalTasks = filteredTasks.filter(
            (task) => task.is_critical_path
        );
        const delayedTasks = criticalTasks.filter((task) => {
            const today = new Date();
            const endDate = new Date(task.end_date);
            return task.status !== "completed" && endDate < today;
        });

        // Critical path calculation function
        const calculateCriticalPath = async () => {
            setCalculatingCriticalPath(true);
            setCriticalPathError(null);

            try {
                console.log(
                    `🔄 Calculating critical path for project ${projectId}`
                );

                const response = await fetch(
                    `/api/projects/${projectId}/critical-path`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem(
                                "token"
                            )}`,
                        },
                    }
                );

                const result = await response.json();

                console.log("📊 Critical path calculation result:", result);

                if (result.success) {
                    setCriticalPathCalculated(true);
                    setCriticalPathError(null);

                    console.log(
                        "✅ Critical path calculation successful, refreshing data..."
                    );

                    // Refresh project data to get updated critical path information
                    await fetchProjectData();

                    console.log(
                        "✅ Project data refreshed after critical path calculation"
                    );

                    // Analyze critical path risks and generate management actions
                    analyzeCriticalPathRisks();

                    toast.success("Critical path calculated successfully!");
                } else {
                    setCriticalPathError(
                        result.error || "Failed to calculate critical path"
                    );
                    toast.error("Failed to calculate critical path");
                }
            } catch (err) {
                console.error("❌ Critical path calculation error:", err);
                setCriticalPathError("Network error occurred");
                toast.error(
                    "Network error occurred while calculating critical path"
                );
            } finally {
                setCalculatingCriticalPath(false);
            }
        };

        // Analyze critical path risks and generate management actions
        const analyzeCriticalPathRisks = () => {
            const criticalTasks = tasks.filter((t) => t.is_critical_path);
            console.log(
                "🔍 Analyzing critical path risks for tasks:",
                criticalTasks
            );

            const risks: any[] = [];
            const actions: any[] = [];

            if (criticalTasks.length === 0) {
                console.log(
                    "⚠️ No critical path tasks found for risk analysis"
                );
                setCriticalPathRisks(risks);
                setCriticalPathActions(actions);
                return;
            }

            // Risk 1: Long duration tasks
            const longDurationTasks = criticalTasks.filter(
                (t) => t.duration > 30
            );
            if (longDurationTasks.length > 0) {
                risks.push({
                    type: "long_duration",
                    severity: "high",
                    title: "Long Duration Critical Tasks",
                    description: `${longDurationTasks.length} critical tasks have duration > 30 days`,
                    tasks: longDurationTasks,
                    impact: "High risk of project delays",
                });
                actions.push({
                    type: "breakdown",
                    title: "Break down long tasks",
                    description: "Consider splitting tasks longer than 30 days",
                    tasks: longDurationTasks,
                });
            }

            // Risk 2: Tasks with no assigned resources
            const unassignedTasks = criticalTasks.filter((t) => {
                const assignments = allTaskAssignments[t.task_id] || [];
                return assignments.length === 0;
            });
            if (unassignedTasks.length > 0) {
                risks.push({
                    type: "unassigned",
                    severity: "critical",
                    title: "Unassigned Critical Tasks",
                    description: `${unassignedTasks.length} critical tasks have no resources assigned`,
                    tasks: unassignedTasks,
                    impact: "Critical tasks cannot start without resources",
                });
                actions.push({
                    type: "assign_resources",
                    title: "Assign resources immediately",
                    description:
                        "Assign team members to unassigned critical tasks",
                    tasks: unassignedTasks,
                });
            }

            // Risk 3: Tasks with low progress (but not completed)
            const lowProgressTasks = criticalTasks.filter(
                (t) =>
                    t.progress_percentage < 25 &&
                    t.status !== "completed" &&
                    t.status !== "todo"
            );
            if (lowProgressTasks.length > 0) {
                risks.push({
                    type: "low_progress",
                    severity: "medium",
                    title: "Slow Progress on Critical Tasks",
                    description: `${lowProgressTasks.length} critical tasks have low progress (< 25%)`,
                    tasks: lowProgressTasks,
                    impact: "Risk of missing deadlines",
                });
                actions.push({
                    type: "accelerate",
                    title: "Accelerate slow tasks",
                    description:
                        "Add resources or overtime to accelerate progress",
                    tasks: lowProgressTasks,
                });
            }

            // Risk 4: Tasks starting soon (within 7 days)
            const today = new Date();
            const startingSoonTasks = criticalTasks.filter((t) => {
                const startDate = new Date(t.start_date);
                const daysUntilStart = Math.ceil(
                    (startDate.getTime() - today.getTime()) /
                        (1000 * 60 * 60 * 24)
                );
                return daysUntilStart <= 7 && daysUntilStart > 0;
            });
            if (startingSoonTasks.length > 0) {
                risks.push({
                    type: "starting_soon",
                    severity: "medium",
                    title: "Critical Tasks Starting Soon",
                    description: `${startingSoonTasks.length} critical tasks start within 7 days`,
                    tasks: startingSoonTasks,
                    impact: "Need immediate attention",
                });
                actions.push({
                    type: "prepare",
                    title: "Prepare for upcoming tasks",
                    description: "Ensure resources and materials are ready",
                    tasks: startingSoonTasks,
                });
            }

            // Risk 5: High dependency tasks (more than 2 dependencies)
            const highDependencyTasks = criticalTasks.filter(
                (t) => (t.predecessor_dependencies || []).length > 2
            );
            if (highDependencyTasks.length > 0) {
                risks.push({
                    type: "high_dependencies",
                    severity: "high",
                    title: "High Dependency Critical Tasks",
                    description: `${highDependencyTasks.length} critical tasks have many dependencies`,
                    tasks: highDependencyTasks,
                    impact: "Risk of cascading delays",
                });
                actions.push({
                    type: "monitor_dependencies",
                    title: "Monitor dependencies closely",
                    description: "Track all dependent tasks to prevent delays",
                    tasks: highDependencyTasks,
                });
            }

            // Risk 6: Overdue tasks
            const overdueTasks = criticalTasks.filter((t) => {
                const endDate = new Date(t.end_date);
                return endDate < today && t.status !== "completed";
            });
            if (overdueTasks.length > 0) {
                risks.push({
                    type: "overdue",
                    severity: "critical",
                    title: "Overdue Critical Tasks",
                    description: `${overdueTasks.length} critical tasks are overdue`,
                    tasks: overdueTasks,
                    impact: "Project timeline already impacted",
                });
                actions.push({
                    type: "emergency_recovery",
                    title: "Emergency recovery plan",
                    description: "Implement immediate recovery actions",
                    tasks: overdueTasks,
                });
            }

            console.log("📊 Risk analysis results:", { risks, actions });
            setCriticalPathRisks(risks);
            setCriticalPathActions(actions);
        };

        return (
            <div className="space-y-6">
                {/* Critical Path Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Critical Path Analysis
                        </h3>

                        {/* Critical Path Calculation Button */}
                        <div className="flex gap-2">
                            <button
                                onClick={calculateCriticalPath}
                                disabled={calculatingCriticalPath}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {calculatingCriticalPath ? (
                                    <>
                                        <RotateCcw className="w-4 h-4 animate-spin" />
                                        Calculating...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        Calculate Critical Path
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    console.log(
                                        "🔍 Manual risk analysis triggered"
                                    );
                                    analyzeCriticalPathRisks();
                                    if (criticalPathRisks.length > 0) {
                                        setShowCriticalPathModal(true);
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Analyze Risks
                            </button>

                            {/* Debug button to force show modal 
              <button
                onClick={() => {
                  console.log('🔧 Debug: Forcing risk analysis and modal');
                  analyzeCriticalPathRisks();
                  setTimeout(() => {
                    console.log('📊 Current risks:', criticalPathRisks);
                    console.log('📊 Current actions:', criticalPathActions);
                    setShowCriticalPathModal(true);
                  }, 100);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Info className="w-4 h-4" />
                Debug Risks
              </button> */}
                        </div>

                        {/* Critical Path Error Display */}
                        {criticalPathError && (
                            <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {criticalPathError}
                            </div>
                        )}

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <Zap size={16} className="text-red-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {criticalTasks.length} critical tasks
                                </span>
                            </div>
                            {delayedTasks.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <AlertTriangle
                                        size={16}
                                        className="text-orange-500"
                                    />
                                    <span className="text-sm text-orange-600 dark:text-orange-400">
                                        {delayedTasks.length} delayed
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Delayed Tasks Alert */}
                    {delayedTasks.length > 0 && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                                <AlertTriangle
                                    size={20}
                                    className="text-red-500"
                                />
                                <h4 className="font-medium text-red-900 dark:text-red-100">
                                    Critical Path Delays Detected
                                </h4>
                            </div>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                {delayedTasks.length} critical tasks are behind
                                schedule, which may impact the project
                                completion date.
                            </p>
                        </div>
                    )}

                    {/* Critical Tasks List */}
                    <div className="space-y-3">
                        {criticalTasks.map((task) => {
                            const isDelayed = delayedTasks.includes(task);
                            const daysUntil = getDaysUntilDeadline(
                                task.end_date
                            );

                            return (
                                <div
                                    key={task.task_id}
                                    className={`p-4 border rounded-lg ${
                                        isDelayed
                                            ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                                            : "border-gray-200 dark:border-gray-700"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Zap
                                                size={16}
                                                className={
                                                    isDelayed
                                                        ? "text-red-500"
                                                        : "text-orange-500"
                                                }
                                            />
                                            <div>
                                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                    {task.name}
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {task.wbs.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            {/* <button
                                                onClick={() =>
                                                    openResourceAssignmentModal(
                                                        task
                                                    )
                                                }
                                                className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors shadow-sm"
                                                title="Assign Resource to Critical Task"
                                            >
                                                <Users size={12} />
                                                <span>Assign</span>
                                            </button> */}
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {formatDate(task.end_date)}
                                                </div>
                                                <div
                                                    className={`text-xs ${
                                                        isDelayed
                                                            ? "text-red-600"
                                                            : daysUntil < 7
                                                            ? "text-orange-600"
                                                            : "text-gray-500"
                                                    }`}
                                                >
                                                    {isDelayed
                                                        ? `${Math.abs(
                                                              daysUntil
                                                          )} days overdue`
                                                        : daysUntil === 0
                                                        ? "Due today"
                                                        : `${daysUntil} days remaining`}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                                        task.status
                                                    )}`}
                                                >
                                                    {task.status.replace(
                                                        "_",
                                                        " "
                                                    )}
                                                </span>
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                                                        task.priority
                                                    )}`}
                                                >
                                                    {task.priority}
                                                </span>
                                            </div>
                                            <div className="w-20 text-right">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center justify-end space-x-1">
                                                    <span>
                                                        {
                                                            task.progress_percentage
                                                        }
                                                        %
                                                    </span>
                                                    {task.progress_percentage ===
                                                        100 && (
                                                        <CheckCircle
                                                            size={12}
                                                            className="text-green-600"
                                                        />
                                                    )}
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-300 ${
                                                            task.progress_percentage ===
                                                            100
                                                                ? "bg-green-500"
                                                                : task.progress_percentage >=
                                                                  75
                                                                ? "bg-blue-500"
                                                                : task.progress_percentage >=
                                                                  50
                                                                ? "bg-yellow-500"
                                                                : task.progress_percentage >=
                                                                  25
                                                                ? "bg-orange-500"
                                                                : "bg-red-400"
                                                        }`}
                                                        style={{
                                                            width: `${task.progress_percentage}%`,
                                                        }}
                                                    ></div>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {allTaskAssignments[
                                                        task.task_id
                                                    ]?.length || 0}{" "}
                                                    resources
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {renderTaskAssignments(task.task_id)}
                                </div>
                            );
                        })}
                        {criticalTasks.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No critical path tasks found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };
export default CriticalPathTab;