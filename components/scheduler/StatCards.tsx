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
            <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 rounded-xl text-white hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-red-100 text-sm font-medium">Total Tasks</p>
                        <p className="text-3xl font-bold">{tasks.length}</p>
                        <p className="text-red-200 text-xs">System-wide</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                        <Calendar className="w-8 h-8 text-white" />
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-xl text-white hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 text-sm font-medium">
                            Schedule Progress
                        </p>
                        <p className="text-3xl font-bold">{avgProgress}%</p>
                        <p className="text-blue-200 text-xs">Average completion</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                        <BarChart className="w-8 h-8 text-white" />
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 rounded-xl text-white hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-emerald-100 text-sm font-medium">
                            Critical Tasks
                        </p>
                        <p className="text-3xl font-bold">{criticalTasks}</p>
                        <p className="text-emerald-200 text-xs">High priority items</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full">
                        <AlertTriangle className="w-8 h-8 text-white" />
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-6 rounded-xl text-white hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-purple-100 text-sm font-medium">
                            Overdue Items
                        </p>
                        <p className="text-3xl font-bold">{overdueTasks}</p>
                        <p className="text-purple-200 text-xs">Require attention</p>
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