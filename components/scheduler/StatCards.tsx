import React from "react";
import { Calendar, BarChart, AlertTriangle, Clock } from "lucide-react";

interface Task {
    task_id: number;
    status: string;
    progress_percentage: number;
    is_critical_path: boolean;
    end_date: string;
}

interface StatCardsProps {
    tasks: Task[];
    filteredTasks: Task[];
}

const StatCards: React.FC<StatCardsProps> = ({ tasks, filteredTasks }) => {
    const avgProgress =
        filteredTasks.length > 0
            ? Math.round(
                  filteredTasks.reduce((sum, task) => sum + task.progress_percentage, 0) /
                      filteredTasks.length
              )
            : 0;

    const criticalTasks = filteredTasks.filter((task) => task.is_critical_path).length;

    const overdueTasks = filteredTasks.filter((task) => {
        const today = new Date();
        const endDate = new Date(task.end_date);
        return task.status !== "completed" && endDate < today;
    }).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 transition-all duration-500">
            <div className="bg-gradient-to-r from-danger to-accent-pink p-6 rounded-xl text-white hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white text-sm font-medium">Total Tasks</p>
                        <p className="text-3xl font-bold">{tasks.length}</p>
                        <p className="text-white text-xs">System-wide</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                        <Calendar className="w-8 h-8 text-white" />
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-info to-accent-indigo p-6 rounded-xl text-white hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white text-sm font-medium">
                            Schedule Progress
                        </p>
                        <p className="text-3xl font-bold">{avgProgress}%</p>
                        <p className="text-white text-xs">Average completion</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                        <BarChart className="w-8 h-8 text-white" />
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-success to-success p-6 rounded-xl text-white hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white text-sm font-medium">
                            Critical Tasks
                        </p>
                        <p className="text-3xl font-bold">{criticalTasks}</p>
                        <p className="text-white text-xs">High priority items</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                        <AlertTriangle className="w-8 h-8 text-white" />
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-accent-violet to-accent-violet p-6 rounded-xl text-white hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white text-sm font-medium">
                            Overdue Items
                        </p>
                        <p className="text-3xl font-bold">{overdueTasks}</p>
                        <p className="text-white text-xs">Require attention</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                        <Clock className="w-8 h-8 text-white" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatCards;