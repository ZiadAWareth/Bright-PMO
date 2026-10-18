export interface DependencyCheckResult {
  isLocked: boolean;
  reasons: string[];
  incompleteDependencies: Array<{
    dependency_id: number;
    predecessor_task_id: number;
    dependency_type: string;
    predecessor: {
      task_id: number;
      name: string;
      status: string;
      progress_percentage: number;
      end_date: string | Date;
    };
  }>;
}

/**
 * Check if a user can access locked tasks based on their role
 */
export function canAccessLockedTask(userRole: string | null): boolean {
  if (!userRole) return false;
  const privilegedRoles = ["ADMIN", "ADMINISTRATOR", "PJM", "PROJECT MANAGER", "PROJECT-MANAGER", "PMO", "IT", "DIR"];
  return privilegedRoles.includes(userRole.toUpperCase());
}

/**
 * Check if a user can access locked tasks - ADMIN ONLY version
 */
export function canAccessLockedTaskAdminOnly(userRole: string | null): boolean {
  if (!userRole) return false;
  const adminRoles = ["ADMIN", "ADMINISTRATOR"];
  return adminRoles.includes(userRole.toUpperCase());
}

/**
 * Helper function to check task dependencies (for client-side use)
 * @param successorDependencies - Array of dependencies where this task is the SUCCESSOR
 *                                 (i.e., tasks that THIS task depends on)
 *                                 Use task.successor_dependencies, NOT task.predecessor_dependencies
 */
export function getTaskLockStatus(successorDependencies: any[]): DependencyCheckResult {
  if (!successorDependencies || successorDependencies.length === 0) {
    return { isLocked: false, reasons: [], incompleteDependencies: [] };
  }

  const incompleteDependencies = successorDependencies.filter(dep => {
    switch (dep.dependency_type) {
      case "finish_to_start":
        return dep.predecessor.status !== "completed";
      case "start_to_start":
        return dep.predecessor.status === "todo";
      case "finish_to_finish":
        return dep.predecessor.status !== "completed";
      case "start_to_finish":
        return dep.predecessor.status === "todo";
      default:
        return false;
    }
  });

  const isLocked = incompleteDependencies.length > 0;
  const reasons = incompleteDependencies.map(dep => {
    let reasonText = "";
    switch (dep.dependency_type) {
      case "finish_to_start":
        reasonText = `"${dep.predecessor.name}" must be completed first`;
        break;
      case "start_to_start":
        reasonText = `"${dep.predecessor.name}" must be started first`;
        break;
      case "finish_to_finish":
        reasonText = `"${dep.predecessor.name}" must be completed before this task can finish`;
        break;
      case "start_to_finish":
        reasonText = `"${dep.predecessor.name}" must be started before this task can finish`;
        break;
    }
    return reasonText;
  });

  return { isLocked, reasons, incompleteDependencies };
}
