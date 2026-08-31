import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    Filter,
    Download,
    Upload,
    Clock,
    AlertTriangle,
    CheckCircle,
    Target,
    Users,
    Building,
    FileText,
    Settings,
    Search,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    Edit,
    Edit2,
    Trash2,
    MapPin,
    DollarSign,
    TrendingUp,
    Activity,
    Star,
    Flag,
    Bell,
    Eye,
    Zap,
    Circle,
    X,
    ArrowDownUp,
    BarChart,
    RotateCcw,
    AlertCircle,
    Info,
    Link,
    GitBranch,
    ArrowRight,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { ProjectWithRelations, ProjectSetup, ProjectTask } from "@/types/project";

interface ScheduleCalendarTabProps {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  showMonthYearPicker: boolean;
  setShowMonthYearPicker: (show: boolean) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  tasks: any[];
  filteredTasks: any[];
  wbsItems: any[];
  project: any;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterPriority: string;
  setFilterPriority: (priority: string) => void;
}

const ScheduleCalendarTab: React.FC<ScheduleCalendarTabProps> = ({
  currentMonth,
  setCurrentMonth,
  showMonthYearPicker,
  setShowMonthYearPicker,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  tasks,
  filteredTasks,
  wbsItems,
  project,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterPriority,
  setFilterPriority,
}) => {
        const renderCalendarView = () => {
        const today = new Date();
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Apply filters to tasks before rendering calendar
        const calendarFilteredTasks = filteredTasks;

        const calendarDays = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarDays.push(
                <div key={`empty-${i}`} className="h-24 p-1"></div>
            );
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);

            // Helper function to normalize dates to local date (ignoring time)
            const normalizeToDate = (date: Date) => {
                return new Date(date.getFullYear(), date.getMonth(), date.getDate());
            };

            // Get different types of events for this day
            const dayTasks = calendarFilteredTasks.filter((task) => {
                const taskStart = normalizeToDate(new Date(task.start_date));
                const taskEnd = normalizeToDate(new Date(task.end_date));
                const normalizedCurrentDate = normalizeToDate(currentDate);
                return normalizedCurrentDate >= taskStart && normalizedCurrentDate <= taskEnd;
            });

            const taskStartsToday = dayTasks.filter((task) => {
                const taskStart = normalizeToDate(new Date(task.start_date));
                const normalizedCurrentDate = normalizeToDate(currentDate);
                return taskStart.getTime() === normalizedCurrentDate.getTime();
            });

            const taskEndsToday = dayTasks.filter((task) => {
                const taskEnd = normalizeToDate(new Date(task.end_date));
                const normalizedCurrentDate = normalizeToDate(currentDate);
                return taskEnd.getTime() === normalizedCurrentDate.getTime();
            });

            const milestonesToday = dayTasks.filter(
                (task) => {
                    if (!task.is_milestone) return false;
                    const taskEnd = normalizeToDate(new Date(task.end_date));
                    const normalizedCurrentDate = normalizeToDate(currentDate);
                    return taskEnd.getTime() === normalizedCurrentDate.getTime();
                }
            );

            const criticalTasksToday = dayTasks.filter(
                (task) => task.is_critical_path
            );

            const overdueTasks = dayTasks.filter((task) => {
                const taskEnd = new Date(task.end_date);
                return taskEnd < currentDate && task.status !== "completed";
            });

            // Check for project start/end dates
            const isProjectStart =
                project &&
                new Date(project.start_date).toDateString() ===
                    currentDate.toDateString();
            const isProjectEnd =
                project &&
                project.planned_end_date &&
                (project.planned_end_date ? new Date(project.planned_end_date) : new Date()).toDateString() ===
                    currentDate.toDateString();

            // Check for WBS start/end dates
            const wbsStartsToday = wbsItems.filter(
                (wbs) =>
                    wbs.start_date &&
                    new Date(wbs.start_date).toDateString() ===
                        currentDate.toDateString()
            );
            const wbsEndsToday = wbsItems.filter(
                (wbs) =>
                    wbs.end_date &&
                    (wbs.end_date ? new Date(wbs.end_date) : new Date()).toDateString() ===
                        currentDate.toDateString()
            );

            const isToday = currentDate.toDateString() === today.toDateString();
            const isWeekend =
                currentDate.getDay() === 0 || currentDate.getDay() === 6;

            // Determine day styling based on content (priority order)
            let dayBgClass = "";
            if (isToday) {
                dayBgClass =
                    "bg-info-soft border-info ";
            } else if (isProjectStart || isProjectEnd) {
                dayBgClass =
                    "bg-accent-indigo-soft  border-accent-indigo ";
            } else if (milestonesToday.length > 0) {
                dayBgClass =
                    "bg-accent-violet-soft  border-accent-violet ";
            } else if (wbsStartsToday.length > 0 || wbsEndsToday.length > 0) {
                dayBgClass =
                    "bg-bright-2-soft  border-bright-2-soft ";
            } else if (overdueTasks.length > 0) {
                dayBgClass =
                    "bg-danger-soft border-danger ";
            } else if (criticalTasksToday.length > 0) {
                dayBgClass =
                    "bg-bright-soft border-bright ";
            } else if (isWeekend) {
                dayBgClass = "bg-surface-2 ";
            }

            calendarDays.push(
                <div
                    key={day}
                    className={`h-32 p-1 border border-line ${dayBgClass} transition-shadow`}
                >
                    <div
                        className={`text-sm font-medium mb-1 flex items-center justify-between ${
                            isToday
                                ? "text-info"
                                : "text-ink"
                        }`}
                    >
                        <span>{day}</span>
                        <div className="flex items-center space-x-1">
                            {(isProjectStart || isProjectEnd) && (
                                <Building
                                    size={8}
                                    className="text-accent-indigo"
                                />
                            )}
                            {(wbsStartsToday.length > 0 ||
                                wbsEndsToday.length > 0) && (
                                <Target size={8} className="text-bright-2" />
                            )}
                            {milestonesToday.length > 0 && (
                                <Star size={8} className="text-accent-violet" />
                            )}
                            {criticalTasksToday.length > 0 && (
                                <Zap size={8} className="text-bright" />
                            )}
                            {overdueTasks.length > 0 && (
                                <AlertTriangle
                                    size={8}
                                    className="text-danger"
                                />
                            )}
                        </div>
                    </div>

                    <div className="space-y-1 text-xs overflow-y-auto max-h-24 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        {(() => {
                            // Show all events now that we have scroll
                            let usedSlots = 0;
                            const maxSlots = 999; // No limit since we have scroll

                            // Project events (highest priority)
                            const projectEvents = [];
                            if (isProjectStart) {
                                projectEvents.push(
                                    <div
                                        key="project-start"
                                        className="bg-accent-indigo-soft text-accent-indigo p-1 rounded truncate flex items-center"
                                        title={`Project Start: ${project?.name}`}
                                    >
                                        <Building
                                            size={8}
                                            className="mr-1 flex-shrink-0"
                                        />
                                        <span className="truncate">
                                            Project Start
                                        </span>
                                    </div>
                                );
                                usedSlots++;
                            }
                            if (isProjectEnd) {
                                projectEvents.push(
                                    <div
                                        key="project-end"
                                        className="bg-accent-indigo-soft text-accent-indigo p-1 rounded truncate flex items-center"
                                        title={`Project End: ${project?.name}`}
                                    >
                                        <Building
                                            size={8}
                                            className="mr-1 flex-shrink-0"
                                        />
                                        <span className="truncate">
                                            Project End
                                        </span>
                                    </div>
                                );
                                usedSlots++;
                            }

                            // WBS events
                            const wbsEvents: React.ReactElement[] = [];
                            wbsStartsToday
                                .slice(0, Math.max(0, maxSlots - usedSlots))
                                .forEach((wbs) => {
                                    wbsEvents.push(
                                        <div
                                            key={`wbs-start-${wbs.wbs_id}`}
                                            className="bg-bright-2-soft text-bright-2 p-1 rounded truncate flex items-center"
                                            title={`WBS Start: ${wbs.name}`}
                                        >
                                            <Target
                                                size={8}
                                                className="mr-1 flex-shrink-0"
                                            />
                                            <span className="truncate">
                                                {wbs.name.substring(0, 12)}
                                            </span>
                                        </div>
                                    );
                                    usedSlots++;
                                });
                            wbsEndsToday
                                .slice(0, Math.max(0, maxSlots - usedSlots))
                                .forEach((wbs) => {
                                    wbsEvents.push(
                                        <div
                                            key={`wbs-end-${wbs.wbs_id}`}
                                            className="bg-bright-2-soft text-bright-2 p-1 rounded truncate flex items-center"
                                            title={`WBS End: ${wbs.name}`}
                                        >
                                            <Target
                                                size={8}
                                                className="mr-1 flex-shrink-0"
                                            />
                                            <span className="truncate">
                                                {wbs.name.substring(0, 12)}
                                            </span>
                                        </div>
                                    );
                                    usedSlots++;
                                });

                            // Milestones
                            const milestoneEvents = milestonesToday
                                .slice(0, Math.max(0, maxSlots - usedSlots))
                                .map((milestone) => (
                                    <div
                                        key={`milestone-${milestone.task_id}`}
                                        className="bg-accent-violet-soft text-accent-violet p-1 rounded truncate flex items-center"
                                        title={`Milestone: ${milestone.name}`}
                                    >
                                        <Flag
                                            size={8}
                                            className="mr-1 flex-shrink-0"
                                        />
                                        <span className="truncate">
                                            {milestone.name.substring(0, 15)}
                                        </span>
                                    </div>
                                ));
                            usedSlots += milestoneEvents.length;

                            // Task starts
                            const taskStartEvents = taskStartsToday
                                .slice(0, Math.max(0, maxSlots - usedSlots))
                                .map((task) => (
                                    <div
                                        key={`start-${task.task_id}`}
                                        className="bg-success-soft text-success p-1 rounded truncate flex items-center"
                                        title={`Starting: ${task.name}`}
                                    >
                                        <Activity
                                            size={8}
                                            className="mr-1 flex-shrink-0"
                                        />
                                        <span className="truncate">
                                            {task.name.substring(0, 12)}
                                        </span>
                                    </div>
                                ));
                            usedSlots += taskStartEvents.length;

                            // Task ends
                            const taskEndEvents = taskEndsToday
                                .slice(0, Math.max(0, maxSlots - usedSlots))
                                .map((task) => (
                                    <div
                                        key={`end-${task.task_id}`}
                                        className="bg-info-soft text-info p-1 rounded truncate flex items-center"
                                        title={`Ending: ${task.name}`}
                                    >
                                        <CheckCircle
                                            size={8}
                                            className="mr-1 flex-shrink-0"
                                        />
                                        <span className="truncate">
                                            {task.name.substring(0, 12)}
                                        </span>
                                    </div>
                                ));
                            usedSlots += taskEndEvents.length;

                            // Ongoing tasks
                            const ongoingTasks = dayTasks.filter(
                                (task) =>
                                    !taskStartsToday.includes(task) &&
                                    !taskEndsToday.includes(task) &&
                                    !milestonesToday.includes(task)
                            );
                            const ongoingEvents = ongoingTasks
                                .slice(0, Math.max(0, maxSlots - usedSlots))
                                .map((task) => (
                                    <div
                                        key={`ongoing-${task.task_id}`}
                                        className={`p-1 rounded truncate flex items-center ${
                                            task.is_critical_path
                                                ? "bg-bright-soft text-bright  "
                                                : "bg-surface-2 text-ink-3  "
                                        }`}
                                        title={`Ongoing: ${task.name}`}
                                    >
                                        <Clock
                                            size={8}
                                            className="mr-1 flex-shrink-0"
                                        />
                                        <span className="truncate">
                                            {task.name.substring(0, 12)}
                                        </span>
                                    </div>
                                ));

                            // Calculate total events to show
                            const totalEvents =
                                projectEvents.length +
                                wbsEvents.length +
                                milestoneEvents.length +
                                taskStartEvents.length +
                                taskEndEvents.length +
                                ongoingEvents.length;
                            const remainingTasks =
                                dayTasks.length +
                                wbsStartsToday.length +
                                wbsEndsToday.length +
                                (isProjectStart ? 1 : 0) +
                                (isProjectEnd ? 1 : 0) -
                                totalEvents;

                            return (
                                <>
                                    {projectEvents}
                                    {wbsEvents}
                                    {milestoneEvents}
                                    {taskStartEvents}
                                    {taskEndEvents}
                                    {ongoingEvents}
                                    {remainingTasks > 0 && (
                                        <div className="text-muted text-center">
                                            +{remainingTasks} more
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-surface rounded-xl border border-line p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => {
                                const newDate = new Date(currentMonth);
                                newDate.setMonth(newDate.getMonth() - 1);
                                setCurrentMonth(newDate);
                            }}
                            className="p-2 hover:bg-surface-2 rounded-lg"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setShowMonthYearPicker(true)}
                            className="text-xl font-semibold hover:bg-surface-2 px-3 py-1 rounded-lg cursor-pointer"
                        >
                            {currentMonth.toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                            })}
                        </button>
                        <button
                            onClick={() => {
                                const newDate = new Date(currentMonth);
                                newDate.setMonth(newDate.getMonth() + 1);
                                setCurrentMonth(newDate);
                            }}
                            className="p-2 hover:bg-surface-2 rounded-lg"
                        >
                            <ChevronRight size={20} />
                        </button>

                        {/* Filter indicator */}
                        {(searchTerm ||
                            filterStatus !== "all" ||
                            filterPriority !== "all") && (
                            <div className="ml-4 px-3 py-1 bg-info-soft text-info text-sm rounded-full flex items-center">
                                <Filter size={14} className="mr-1" />
                                <span>
                                    {[
                                        searchTerm && "Search",
                                        filterStatus !== "all" && "Status",
                                        filterPriority !== "all" && "Priority",
                                    ]
                                        .filter(Boolean)
                                        .join(", ")}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        {(searchTerm ||
                            filterStatus !== "all" ||
                            filterPriority !== "all") && (
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setFilterStatus("all");
                                    setFilterPriority("all");
                                }}
                                className="px-3 py-1 border border-line text-ink-3 rounded-lg hover:bg-surface-2 transition-colors text-sm"
                            >
                                Clear Filters
                            </button>
                        )}
                        <button
                            onClick={() => setCurrentMonth(new Date())}
                            className="px-4 py-2 bg-info text-white rounded-lg hover:opacity-90 transition-colors"
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (day) => (
                            <div
                                key={day}
                                className="h-8 flex items-center justify-center text-sm font-medium text-muted"
                            >
                                {day}
                            </div>
                        )
                    )}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">{calendarDays}</div>

                {/* Filter Summary */}
                {(searchTerm ||
                    filterStatus !== "all" ||
                    filterPriority !== "all") && (
                    <div className="mt-6 p-4 bg-info-soft border border-info rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-info flex items-center">
                                <Filter size={16} className="mr-2" />
                                Active Filters
                            </h4>
                            <span className="text-xs text-info">
                                Showing {filteredTasks.length} of {tasks.length}{" "}
                                tasks
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {searchTerm && (
                                <div className="text-xs text-info">
                                    <span className="font-medium">Search:</span>{" "}
                                    "{searchTerm}"
                                </div>
                            )}
                            {filterStatus !== "all" && (
                                <div className="text-xs text-info">
                                    <span className="font-medium">Status:</span>{" "}
                                    {filterStatus.replace("_", " ")}
                                </div>
                            )}
                            {filterPriority !== "all" && (
                                <div className="text-xs text-info">
                                    <span className="font-medium">
                                        Priority:
                                    </span>{" "}
                                    {filterPriority}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Calendar Legend */}
                <div className="mt-6 p-4 bg-surface-2 rounded-lg">
                    <h4 className="text-sm font-medium text-ink mb-3">
                        Calendar Legend
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                        <div className="flex items-center space-x-2">
                            <Building size={12} className="text-accent-indigo" />
                            <span className="text-ink-3">
                                Project Events
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Target size={12} className="text-bright-2" />
                            <span className="text-ink-3">
                                WBS Events
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Flag size={12} className="text-accent-violet" />
                            <span className="text-ink-3">
                                Milestones
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Activity size={12} className="text-success" />
                            <span className="text-ink-3">
                                Task Starts
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <CheckCircle size={12} className="text-info" />
                            <span className="text-ink-3">
                                Task Ends
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Clock size={12} className="text-muted" />
                            <span className="text-ink-3">
                                Ongoing
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Zap size={12} className="text-bright" />
                            <span className="text-ink-3">
                                Critical Path
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <AlertTriangle size={12} className="text-danger" />
                            <span className="text-ink-3">
                                Overdue
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-info-soft rounded border"></div>
                            <span className="text-ink-3">
                                Today
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-surface-2 rounded border"></div>
                            <span className="text-ink-3">
                                Weekend
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            {renderCalendarView()}
        </div>
    );
};

export default ScheduleCalendarTab;