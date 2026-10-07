import { prisma } from '@/lib/prisma';

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
 * Check if a task should be locked based on its dependencies
 */
export async function checkTaskDependencies(taskId: number): Promise<DependencyCheckResult> {
  try {
    // Get all predecessor dependencies for this task
    const dependencies = await prisma.taskDependency.findMany({
      where: { successor_task_id: taskId },
      include: {
        predecessor: {
          select: {
            task_id: true,
            name: true,
            status: true,
            progress_percentage: true,
            end_date: true
          }
        }
      }
    });

    if (dependencies.length === 0) {
      return { isLocked: false, reasons: [], incompleteDependencies: [] };
    }

    const incompleteDependencies = dependencies.filter(dep => {
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
  } catch (error) {
    console.error('Error checking task dependencies:', error);
    return { isLocked: false, reasons: [], incompleteDependencies: [] };
  }
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
 * Get tasks with dependency status for a project
 */
export async function getTasksWithDependencyStatus(projectId: number, userId?: number, userRole?: string) {
  try {
    // Get all tasks for the project
    const tasks = await prisma.task.findMany({
      where: {
        wbs: {
          project_id: projectId
        }
      },
      include: {
        assigned_users: {
          include: {
            user: {
              select: {
                user_id: true,
                account: {
                  select: {
                    first_name: true,
                    last_name: true
                  }
                }
              }
            }
          }
        },
        // CORRECT: Get tasks that THIS task depends on (where this task is the successor)
        successor_dependencies: {
          include: {
            predecessor: {
              select: {
                task_id: true,
                name: true,
                status: true,
                progress_percentage: true,
                end_date: true
              }
            }
          }
        }
      }
    });

    // Add dependency status to each task
    const tasksWithStatus = tasks.map(task => {
      const lockStatus = getTaskLockStatus(task.successor_dependencies);
      const canAccess = canAccessLockedTask(userRole || null);
      
      return {
        ...task,
        dependency_lock_status: {
          isLocked: lockStatus.isLocked,
          canAccess: canAccess,
          reasons: lockStatus.reasons,
          incompleteDependencies: lockStatus.incompleteDependencies
        }
      };
    });

    return tasksWithStatus;
  } catch (error) {
    console.error('Error getting tasks with dependency status:', error);
    throw error;
  }
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
