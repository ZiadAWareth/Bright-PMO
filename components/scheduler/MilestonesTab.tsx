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
                <div className="bg-surface rounded-xl border border-line p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-ink">
                            Upcoming Milestones
                        </h3>
                        <span className="text-sm text-muted">
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
                                    className="p-4 border border-line rounded-lg"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <Star
                                                size={20}
                                                className="text-accent-violet"
                                            />
                                            <div>
                                                <h4 className="font-medium text-ink">
                                                    {milestone.name}
                                                </h4>
                                                <p className="text-sm text-muted">
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
                                                    className="flex items-center space-x-1 px-3 py-1 text-xs bg-info hover:opacity-90 text-white rounded-md font-medium transition-colors shadow-sm"
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
                                                    className="flex items-center space-x-1 px-2 py-1 bg-success-soft hover:bg-success-soft text-success rounded text-xs font-medium transition-colors"
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
                                                    className="flex items-center space-x-1 px-2 py-1 bg-danger-soft hover:bg-danger-soft text-danger rounded text-xs font-medium transition-colors"
                                                    title="Delete Milestone"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-ink">
                                                    {formatDate(
                                                        milestone.end_date
                                                    )}
                                                </div>
                                                <div
                                                    className={`text-xs ${
                                                        daysUntil < 0
                                                            ? "text-danger"
                                                            : daysUntil < 7
                                                            ? "text-bright"
                                                            : "text-muted"
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
                            <div className="text-center py-8 text-muted">
                                No upcoming milestones
                            </div>
                        )}
                    </div>
                </div>

                {/* Completed Milestones */}
                <div className="bg-surface rounded-xl border border-line p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-ink">
                            Completed Milestones
                        </h3>
                        <span className="text-sm text-muted">
                            {completedMilestones.length} completed
                        </span>
                    </div>
                    <div className="space-y-3">
                        {completedMilestones.slice(0, 5).map((milestone) => (
                            <div
                                key={milestone.task_id}
                                className="flex items-center justify-between p-4 bg-success-soft border border-success rounded-lg"
                            >
                                <div className="flex items-center space-x-3">
                                    <CheckCircle
                                        size={20}
                                        className="text-success"
                                    />
                                    <div>
                                        <h4 className="font-medium text-ink">
                                            {milestone.name}
                                        </h4>
                                        <p className="text-sm text-muted">
                                            {milestone.wbs.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-ink">
                                        {formatDate(
                                            milestone.actual_end_date ||
                                                milestone.end_date
                                        )}
                                    </div>
                                    <div className="text-xs text-success">
                                        Completed
                                    </div>
                                </div>
                            </div>
                        ))}
                        {completedMilestones.length === 0 && (
                            <div className="text-center py-8 text-muted">
                                No completed milestones yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };
export default MilestonesTab;