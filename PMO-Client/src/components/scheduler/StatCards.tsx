import React from "react";
import { Calendar, BarChart, AlertTriangle, Clock } from "lucide-react";
import { StatCard } from "@/components/ui/form-shell";

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Total Tasks" value={tasks.length} hint="System-wide" icon={Calendar} tone="info" />
            <StatCard label="Schedule Progress" value={`${avgProgress}%`} hint="Average completion" icon={BarChart} tone="brand" />
            <StatCard label="Critical Tasks" value={criticalTasks} hint="High priority items" icon={AlertTriangle} tone="danger" />
            <StatCard label="Overdue Items" value={overdueTasks} hint="Require attention" icon={Clock} tone="warning" />
        </div>
    );
};

export default StatCards;
