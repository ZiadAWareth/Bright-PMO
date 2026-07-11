import { Task, ProjectSetup, Phase } from "@/types/project";
import { calculateEndDate, addWorkingDays, calculateWorkingDays } from "@/lib/working-days";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { z } from "zod";

export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "wbs-search";

export interface FieldConfig<T extends Record<string, any>> {
    key: string;
    label: string;
    type: FieldType;
    required?: boolean;
    placeholder?: string;
    options?: { value: string; label: string }[];
    min?: number;
    step?: number;
    rows?: number;
    helper?: string;
    className?: string;
    [key: string]: any; // allow extra HTML props
}

// Helper to format Date object as YYYY-MM-DD in local timezone
export const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
// Calculate dates based on dependency type
export function calculateDatesFromDependency(
  predecessorTask: Task,
  depType: string,
  lag: number,
  duration: number,
  setup: ProjectSetup | null
) {
  console.log("CALC INPUT", { predecessorTask, depType, lag, duration, setup });
  const offDays = setup?.off_days || [];
  let startDate: Date;
  let endDate: Date;

  // Parse predecessor dates robustly (handle Date or string)
  const getDateParts = (dateVal: string | Date) => {
      let dateStr: string;
      if (dateVal instanceof Date) {
          // Use toISOString and get date part
          dateStr = dateVal.toISOString().split('T')[0];
      } else {
          // Already a string
          dateStr = dateVal.split('T')[0];
      }
      return dateStr.split('-').map(Number);
  };

  const [predStartYear, predStartMonth, predStartDay] = getDateParts(predecessorTask.start_date);
  const [predEndYear, predEndMonth, predEndDay] = getDateParts(predecessorTask.end_date);
  const predStart = new Date(predStartYear, predStartMonth - 1, predStartDay);
  const predEnd = new Date(predEndYear, predEndMonth - 1, predEndDay);

  console.log('🔍 Dependency Calculation:', {
      predecessor: predecessorTask.name,
      type: depType,
      lag,
      duration,
      predStart: formatDateLocal(predStart),
      predEnd: formatDateLocal(predEnd),
      offDays
  });

  switch (depType) {
      case 'finish_to_start': // FS: Successor starts after predecessor finishes + lag
          // For FS: add 1 day to move past finish date, then add lag
          // If lag is negative (e.g., -1), this creates overlap (start before predecessor finishes)
          console.log(`  FS: predEnd + (1 + ${lag}) = predEnd + ${1 + lag}`);
          startDate = addWorkingDays(predEnd, 1 + lag, offDays);
          console.log(`  Start: ${formatDateLocal(startDate)}`);
          endDate = calculateEndDate(startDate, duration, offDays);
          console.log(`  End: ${formatDateLocal(endDate)}`);
          break;

      case 'start_to_start': // SS: Successor starts after predecessor starts + lag
          console.log(`  SS: predStart + ${lag}`);
          startDate = addWorkingDays(predStart, lag, offDays);
          endDate = calculateEndDate(startDate, duration, offDays);
          break;

      case 'finish_to_finish': // FF: Successor finishes when predecessor finishes + lag
          console.log(`  FF: predEnd + ${lag}`);
          endDate = addWorkingDays(predEnd, lag, offDays);
          // Calculate start date backwards from end date
          startDate = addWorkingDays(endDate, -(duration - 1), offDays);
          break;

      case 'start_to_finish': // SF: Successor finishes when predecessor starts + lag
          console.log(`  SF: predStart + ${lag}`);
          endDate = addWorkingDays(predStart, lag, offDays);
          // Calculate start date backwards from end date
          startDate = addWorkingDays(endDate, -(duration - 1), offDays);
          break;

      default:
          // Default to FS
          console.log(`  DEFAULT (FS): predEnd + (1 + ${lag}) = predEnd + ${1 + lag}`);
          startDate = addWorkingDays(predEnd, 1 + lag, offDays);
          endDate = calculateEndDate(startDate, duration, offDays);
  }

  const result = {
      start_date: formatDateLocal(startDate),
      end_date: formatDateLocal(endDate)
  };
  console.log('✅ Result:', result);
  // After calculating:
  console.log("CALC OUTPUT", { start_date: result.start_date, end_date: result.end_date });
  return result;
};

export const calculateDuration = (startDate: string, endDate: string, setup: ProjectSetup | null) => {
        if (startDate && endDate) {
            const offDays = setup?.off_days || [];
            // Parse dates as local time to avoid timezone issues
            const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
            const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
            const workingDays = calculateWorkingDays(
                new Date(startYear, startMonth - 1, startDay),
                new Date(endYear, endMonth - 1, endDay),
                offDays
            );
            return workingDays || 1;
        }
        return 1;
    };

export const taskSchema = z.object({
        name: z.string().min(1, "Task name is required"),
        description: z.string().optional(),
        wbs_id: z.string().min(1, "WBS selection is required"),
        start_date: z.string().min(1, "Start date is required"),
        end_date: z.string().min(1, "End date is required"),
        duration: z.number().min(1, "Duration must be at least 1 day"),
        estimated_hours: z.number().min(0, "Estimated hours cannot be negative"),
        priority: z.enum(["low", "medium", "high"]),
        status: z.enum(["todo", "in_progress", "completed", "on_hold"]),
        work_package: z.string().optional(),
        is_milestone: z.boolean(),
        progress_percentage: z.number().optional(),
    });

export const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            timeZone: "UTC",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

export const getDaysUntilDeadline = (endDate: string) => {
        const today = new Date();
        const deadline = new Date(endDate);
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

export const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
            case "in_progress":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
            case "on_hold":
                return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
        }
    };

export const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high":
                return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800";
            case "medium":
                return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
            case "low":
                return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
        }
    };
const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case "high":
                return <AlertTriangle size={16} className="text-red-500" />;
            case "medium":
                return <Clock size={16} className="text-yellow-500" />;
            case "low":
                return <CheckCircle size={16} className="text-green-500" />;
            default:
                return <Clock size={16} className="text-gray-500" />;
        }
    };  

    export const organizePhasesFromWBS = (wbsList: any[], taskList: Task[]): Phase[] => {
    const level1WBS = wbsList.filter((wbs) => wbs.level === 1);

    const organizedPhases: Phase[] = level1WBS.map((wbs, index) => {
        const phaseTasks = taskList.filter((task) => {
            if (task.wbs.wbs_id === wbs.wbs_id) {
                return true;
            }

            const childWBS = wbsList.filter(
                (childWbs) =>
                    childWbs.parent_wbs_id === wbs.wbs_id ||
                    (childWbs.level > 1 && childWbs.wbs_code.startsWith(wbs.wbs_code))
            );

            return childWBS.some((child) => task.wbs.wbs_id === child.wbs_id);
        });

        const milestones = phaseTasks.filter((task) => task.is_milestone);
        const progress = wbs.progress_percentage || 0;

        const startDate =
            phaseTasks.length > 0
                ? phaseTasks.reduce(
                      (earliest, task) =>
                          new Date(task.start_date) < new Date(earliest)
                              ? task.start_date
                              : earliest,
                      phaseTasks[0].start_date
                  )
                : wbs.start_date || "";

        const endDate =
            phaseTasks.length > 0
                ? phaseTasks.reduce(
                      (latest, task) =>
                          new Date(task.end_date) > new Date(latest)
                              ? task.end_date
                              : latest,
                      phaseTasks[0].end_date
                  )
                : wbs.end_date || "";

        const today = new Date();
        const wbsStartDate = new Date(startDate);
        const wbsEndDate = new Date(endDate);

        let status: Phase["status"] = "upcoming";
        if (progress === 100) {
            status = "completed";
        } else if (progress > 0) {
            status = "active";
        } else if (wbsEndDate < today && progress < 100) {
            status = "delayed";
        }

        const colors = [
            "bg-blue-500",
            "bg-orange-500",
            "bg-purple-500",
            "bg-green-500",
            "bg-indigo-500",
            "bg-pink-500",
            "bg-teal-500",
        ];

        return {
            id: `wbs-${wbs.wbs_id}`,
            name: wbs.name,
            description: wbs.description || `WBS Level 1: ${wbs.name}`,
            startDate,
            endDate,
            status,
            progress,
            tasks: phaseTasks,
            milestones,
            color: colors[index % colors.length],
        };
    });

    return organizedPhases;
};

export const calculateScheduleStats = (tasks: Task[]) => {
    const totalTasks = tasks.length;
    const avgProgress =
        tasks.length > 0
            ? Math.round(
                  tasks.reduce((sum, task) => sum + task.progress_percentage, 0) /
                      tasks.length
              )
            : 0;
    const criticalTasks = tasks.filter((task) => task.is_critical_path).length;
    const overdueTasks = tasks.filter((task) => {
        const today = new Date();
        const endDate = new Date(task.end_date);
        return task.status !== "completed" && endDate < today;
    }).length;

    return {
        totalTasks,
        avgProgress,
        criticalTasks,
        overdueTasks,
    };
};

export const filterTasks = (
    tasks: Task[],
    searchTerm: string,
    filterStatus: string,
    filterPriority: string
) => {
    return tasks.filter((task) => {
        const matchesSearch =
            task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.wbs.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === "all" || task.status === filterStatus;
        const matchesPriority =
            filterPriority === "all" || task.priority === filterPriority;

        return matchesSearch && matchesStatus && matchesPriority;
    });
}