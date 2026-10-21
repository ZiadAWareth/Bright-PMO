import { useState, useEffect } from "react";
import { Task, ProjectSetup, TaskAddUpdate } from "@/features/projects/types";
import { calculateDatesFromDependency } from "@/features/waterfall/schedule/components/taskHelpers";

interface DependencyData {
  predecessor_task_id: number;
  dependency_type: string;
  lag_time: number;
  dependency_id?: number;
}

interface UseTaskDependenciesProps {
  tasks: Task[];
  formData: TaskAddUpdate;
  setFormData: React.Dispatch<React.SetStateAction<TaskAddUpdate>>;
  setup: ProjectSetup | null;
  initialDependencies?: DependencyData[];
  taskId?: number; // For edit mode
}

interface UseTaskDependenciesReturn {
  selectedPredecessors: number[];
  dependencyTypes: Record<number, string>;
  lagTimes: Record<number, number>;
  addDependency: (taskId: number, task: Task) => void;
  removeDependency: (taskId: number) => void;
  updateDependencyType: (taskId: number, type: string, recalculateDates?: boolean) => void;
  updateLagTime: (taskId: number, lag: number, recalculateDates?: boolean) => void;
  saveDependencies: (createdTaskId: number) => Promise<void>;
  updateDependencies: (taskId: number, existingDependencies: DependencyData[]) => Promise<void>;
}

export const useTaskDependencies = ({
  tasks,
  formData,
  setFormData,
  setup,
  initialDependencies = [],
  taskId,
}: UseTaskDependenciesProps): UseTaskDependenciesReturn => {
  const [selectedPredecessors, setSelectedPredecessors] = useState<number[]>(() => {
    // Initialize from initialDependencies on mount
    return initialDependencies.map(dep => dep.predecessor_task_id);
  });
  
  const [dependencyTypes, setDependencyTypes] = useState<Record<number, string>>(() => {
    // Initialize from initialDependencies on mount
    const types: Record<number, string> = {};
    initialDependencies.forEach(dep => {
      types[dep.predecessor_task_id] = dep.dependency_type;
    });
    return types;
  });
  
  const [lagTimes, setLagTimes] = useState<Record<number, number>>(() => {
    // Initialize from initialDependencies on mount
    const lags: Record<number, number> = {};
    initialDependencies.forEach(dep => {
      lags[dep.predecessor_task_id] = dep.lag_time;
    });
    return lags;
  });

  // Remove the useEffect - we're initializing in useState instead

  /**
   * Calculate and update task dates based on dependency
   * Skip recalculation in edit mode to preserve user's manual edits
   */
  const recalculateTaskDates = (
    predecessorTask: Task,
    depType: string,
    lag: number,
    skipRecalc: boolean = false
  ) => {
    // Skip recalculation if explicitly requested (e.g., when just updating existing dependency settings)
    if (skipRecalc) return;
    
    try {
      const calculatedDates = calculateDatesFromDependency(
        predecessorTask,
        depType,
        lag,
        formData.duration,
        setup || null
      );
      
      setFormData((prev) => ({
        ...prev,
        start_date: calculatedDates.start_date,
        end_date: calculatedDates.end_date,
      }));
    } catch (error) {
      console.error("Error calculating dates from dependency:", error);
    }
  };

  /**
   * Add a new dependency
   */
  const addDependency = (taskId: number, task: Task) => {
    // Add to selected predecessors
    setSelectedPredecessors((prev) => [...prev, taskId]);

    // Initialize with default dependency type (Finish-to-Start)
    const defaultType = "finish_to_start";
    setDependencyTypes((prev) => ({
      ...prev,
      [taskId]: defaultType,
    }));

    // Initialize with zero lag
    setLagTimes((prev) => ({
      ...prev,
      [taskId]: 0,
    }));

    // Auto-calculate dates based on default FS dependency
    // The task object is passed in, so we use it directly
    recalculateTaskDates(task, defaultType, 0, false);
  };

  /**
   * Remove a dependency
   */
  const removeDependency = (taskId: number) => {
    // Remove from selected predecessors
    setSelectedPredecessors((prev) => prev.filter((id) => id !== taskId));

    // Remove from dependency types
    setDependencyTypes((prev) => {
      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });

    // Remove from lag times
    setLagTimes((prev) => {
      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });
  };

  /**
   * Update dependency type and optionally recalculate dates
   */
  const updateDependencyType = (taskId: number, type: string, recalculateDates: boolean = true) => {
    setDependencyTypes((prev) => ({
      ...prev,
      [taskId]: type,
    }));

    // Only recalculate if requested (true for create mode, can be false for edit mode)
    if (recalculateDates) {
      // Find the predecessor task - need to search in ALL tasks, not just filtered ones
      const predecessorTask = tasks.find((t) => t.task_id === taskId);
      if (predecessorTask) {
        const lag = lagTimes[taskId] || 0;
        recalculateTaskDates(predecessorTask, type, lag, false);
      } else {
        console.warn(`Could not find predecessor task with ID ${taskId} for recalculation`);
      }
    }
  };

  /**
   * Update lag time and optionally recalculate dates
   */
  const updateLagTime = (taskId: number, lag: number, recalculateDates: boolean = true) => {
    setLagTimes((prev) => ({
      ...prev,
      [taskId]: lag,
    }));

    // Only recalculate if requested (true for create mode, can be false for edit mode)
    if (recalculateDates) {
      // Find the predecessor task - need to search in ALL tasks, not just filtered ones
      const predecessorTask = tasks.find((t) => t.task_id === taskId);
      if (predecessorTask) {
        const depType = dependencyTypes[taskId] || "finish_to_start";
        recalculateTaskDates(predecessorTask, depType, lag, false);
      } else {
        console.warn(`Could not find predecessor task with ID ${taskId} for recalculation`);
      }
    }
  };

  // notConnected: these saved the selected predecessors (with type and lag) for
  // a new task, and synced them for an edited one. The selections above are
  // kept so the integration can send them.
  const saveDependencies = async (_createdTaskId: number): Promise<void> => {};

  const updateDependencies = async (
    _taskId: number,
    _existingDependencies: DependencyData[]
  ): Promise<void> => {};

  return {
    selectedPredecessors,
    dependencyTypes,
    lagTimes,
    addDependency,
    removeDependency,
    updateDependencyType,
    updateLagTime,
    saveDependencies,
    updateDependencies,
  };
};