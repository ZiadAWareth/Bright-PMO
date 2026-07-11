import React from "react";
import {CheckCircle,Star, Edit2, Trash2} from "lucide-react"; 
import type { Task } from "@/types/project";
interface MilestonesTabProps {
  filteredTasks: Task[];
  handleEditTask: (task: Task) => void;
  handleDeleteTask: (taskId: number, wbsId: number) => void;
  getDaysUntilDeadline: (date: string) => number;
  formatDate: (date: string) => string;
  getPriorityColor: (priority: string) => string;
  renderTaskAssignments: (taskId: number) => React.ReactNode;
}

const MilestonesTab: React.FC<MilestonesTabProps> = ({
  filteredTasks,
  handleEditTask,
  handleDeleteTask,
  getDaysUntilDeadline,
  formatDate,
  getPriorityColor,
  renderTaskAssignments,
}) => {
  const milestones = filteredTasks.filter((task) => task.is_milestone);
  const upcomingMilestones = milestones.filter(
    (task) => new Date(task.end_date) > new Date()
  );
  const completedMilestones = milestones.filter(
    (task) => task.status === "completed"
  );

        return (
            <div className="space-y-6">
                {/* Upcoming Milestones */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Upcoming Milestones
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {upcomingMilestones.length} milestones
                        </span>
                    </div>
                    <div className="space-y-3">
                        {upcomingMilestones.map((milestone) => {
                            const daysUntil = getDaysUntilDeadline(
                                milestone.end_date
                            );
                            return (
                                <div
                                    key={milestone.task_id}
                                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Star
                                                size={20}
                                                className="text-purple-500"
                                            />
                                            <div>
                                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                    {milestone.name}
                                                </h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {milestone.wbs.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                {/* <button
                                                    onClick={() =>
                                                        openResourceAssignmentModal(
                                                            milestone
                                                        )
                                                    }
                                                    className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors shadow-sm"
                                                    title="Assign Resource to Milestone"
                                                >
                                                    <Users size={12} />
                                                    <span>Assign</span>
                                                </button> */}
                                                <button
                                                    onClick={() =>
                                                        handleEditTask(
                                                            milestone
                                                        )
                                                    }
                                                    className="flex items-center space-x-1 px-2 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 rounded text-xs font-medium transition-colors"
                                                    title="Edit Milestone"
                                                >
                                                    <Edit2 size={10} />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDeleteTask(
                                                            milestone.task_id,
                                                            milestone.wbs_id
                                                        )
                                                    }
                                                    className="flex items-center space-x-1 px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded text-xs font-medium transition-colors"
                                                    title="Delete Milestone"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {formatDate(
                                                        milestone.end_date
                                                    )}
                                                </div>
                                                <div
                                                    className={`text-xs ${
                                                        daysUntil < 0
                                                            ? "text-red-600"
                                                            : daysUntil < 7
                                                            ? "text-orange-600"
                                                            : "text-gray-500"
                                                    }`}
                                                >
                                                    {daysUntil < 0
                                                        ? `${Math.abs(
                                                              daysUntil
                                                          )} days overdue`
                                                        : daysUntil === 0
                                                        ? "Due today"
                                                        : `${daysUntil} days remaining`}
                                                </div>
                                            </div>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                                                    milestone.priority
                                                )}`}
                                            >
                                                {milestone.priority}
                                            </span>
                                        </div>
                                    </div>
                                    {renderTaskAssignments(milestone.task_id)}
                                </div>
                            );
                        })}
                        {upcomingMilestones.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No upcoming milestones
                            </div>
                        )}
                    </div>
                </div>

                {/* Completed Milestones */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Completed Milestones
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {completedMilestones.length} completed
                        </span>
                    </div>
                    <div className="space-y-3">
                        {completedMilestones.slice(0, 5).map((milestone) => (
                            <div
                                key={milestone.task_id}
                                className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                            >
                                <div className="flex items-center space-x-3">
                                    <CheckCircle
                                        size={20}
                                        className="text-green-500"
                                    />
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                            {milestone.name}
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {milestone.wbs.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {formatDate(
                                            milestone.actual_end_date ||
                                                milestone.end_date
                                        )}
                                    </div>
                                    <div className="text-xs text-green-600 dark:text-green-400">
                                        Completed
                                    </div>
                                </div>
                            </div>
                        ))}
                        {completedMilestones.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                No completed milestones yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };
export default MilestonesTab;