import { prisma } from '@/lib/prisma';
import { DependencyType } from '@prisma/client';

interface TaskNode {
  task_id: number;
  name: string;
  duration: number;
  start_date: Date;
  end_date: Date;
  predecessors: TaskDependency[];
  successors: TaskDependency[];
  early_start?: Date;
  early_finish?: Date;
  late_start?: Date;
  late_finish?: Date;
  total_float?: number;
  free_float?: number;
  is_critical_path?: boolean;
}

interface TaskDependency {
  dependency_id: number;
  predecessor_task_id: number;
  successor_task_id: number;
  dependency_type: DependencyType;
  lag_time: number;
}

export class CriticalPathCalculator {
  private tasks: Map<number, TaskNode> = new Map();
  private projectStartDate: Date = new Date();
  private projectEndDate: Date = new Date();

  /**
   * Calculate critical path for a given project
   */
  async calculateCriticalPath(projectId: number): Promise<{
    criticalPathTasks: number[];
    projectDuration: number;
    calculationSummary: {
      totalTasks: number;
      criticalPathLength: number;
      longestPath: string[];
    };
  }> {
    // 1. Load all tasks and dependencies for the project
    await this.loadProjectTasks(projectId);

    // 2. Perform forward pass calculation
    this.forwardPass();

    // 3. Perform backward pass calculation
    this.backwardPass();

    // 4. Calculate float times
    this.calculateFloatTimes();

    // 5. Identify critical path
    const criticalPathTasks = this.identifyCriticalPath();

    // 6. Update database with calculated values
    await this.updateTasksInDatabase();

    // 7. Return results
    const projectDuration = this.calculateProjectDuration();
    
    return {
      criticalPathTasks,
      projectDuration,
      calculationSummary: {
        totalTasks: this.tasks.size,
        criticalPathLength: criticalPathTasks.length,
        longestPath: this.getCriticalPathNames(criticalPathTasks),
      },
    };
  }

  /**
   * Load all tasks and their dependencies for a project
   */
  private async loadProjectTasks(projectId: number): Promise<void> {
    const tasksData = await prisma.task.findMany({
      where: {
        wbs: {
          project_id: projectId,
        },
      },
      include: {
        predecessor_dependencies: true,
        successor_dependencies: true,
        wbs: {
          select: {
            project_id: true,
          },
        },
      },
    });

    // Convert to TaskNode format
    this.tasks.clear();
    for (const task of tasksData) {
      const taskNode: TaskNode = {
        task_id: task.task_id,
        name: task.name,
        duration: task.duration,
        start_date: task.start_date,
        end_date: task.end_date,
        predecessors: task.predecessor_dependencies,
        successors: task.successor_dependencies,
      };
      this.tasks.set(task.task_id, taskNode);
    }

    // Set project boundaries
    this.setProjectBoundaries();
  }

  /**
   * Set project start and end dates based on tasks
   */
  private setProjectBoundaries(): void {
    if (this.tasks.size === 0) return;

    const allTasks = Array.from(this.tasks.values());
    this.projectStartDate = new Date(Math.min(...allTasks.map(t => t.start_date.getTime())));
    this.projectEndDate = new Date(Math.max(...allTasks.map(t => t.end_date.getTime())));
  }

  /**
   * Forward Pass: Calculate Early Start and Early Finish dates
   */
  private forwardPass(): void {
    const visited = new Set<number>();
    const tasksArray = Array.from(this.tasks.values());

    // Sort tasks by start date for initial processing
    tasksArray.sort((a, b) => a.start_date.getTime() - b.start_date.getTime());

    for (const task of tasksArray) {
      this.calculateEarlyDates(task.task_id, visited);
    }
  }

  /**
   * Calculate early start and finish dates for a task
   */
  private calculateEarlyDates(taskId: number, visited: Set<number>): void {
    if (visited.has(taskId)) return;

    const task = this.tasks.get(taskId);
    if (!task) return;

    visited.add(taskId);

    // If task has no predecessors, early start = project start or task start date
    if (task.predecessors.length === 0) {
      task.early_start = new Date(Math.max(
        this.projectStartDate.getTime(),
        task.start_date.getTime()
      ));
    } else {
      // Calculate based on predecessors
      let maxEarlyFinish = new Date(0);

      for (const pred of task.predecessors) {
        // Ensure predecessor is calculated first
        this.calculateEarlyDates(pred.predecessor_task_id, visited);
        
        const predTask = this.tasks.get(pred.predecessor_task_id);
        if (!predTask || !predTask.early_finish) continue;

        const adjustedFinish = this.adjustDateForDependencyType(
          predTask.early_finish,
          predTask.early_start!,
          pred.dependency_type,
          pred.lag_time
        );

        if (adjustedFinish.getTime() > maxEarlyFinish.getTime()) {
          maxEarlyFinish = adjustedFinish;
        }
      }

      task.early_start = maxEarlyFinish;
    }

    // Calculate early finish = early start + duration
    task.early_finish = this.addDays(task.early_start, task.duration);
  }

  /**
   * Backward Pass: Calculate Late Start and Late Finish dates
   */
  private backwardPass(): void {
    const visited = new Set<number>();
    const tasksArray = Array.from(this.tasks.values());

    // Find tasks with no successors (end tasks)
    const endTasks = tasksArray.filter(task => task.successors.length === 0);

    // Set project end date as late finish for end tasks
    for (const task of endTasks) {
      if (task.early_finish) {
        task.late_finish = new Date(Math.max(
          task.early_finish.getTime(),
          this.projectEndDate.getTime()
        ));
      }
    }

    // Calculate late dates for all tasks
    for (const task of endTasks) {
      this.calculateLateDates(task.task_id, visited);
    }
  }

  /**
   * Calculate late start and finish dates for a task
   */
  private calculateLateDates(taskId: number, visited: Set<number>): void {
    if (visited.has(taskId)) return;

    const task = this.tasks.get(taskId);
    if (!task) return;

    visited.add(taskId);

    // If task has no successors and late_finish is not set
    if (task.successors.length === 0 && !task.late_finish) {
      task.late_finish = task.early_finish || task.end_date;
    }

    // If late_finish is set but late_start is not
    if (task.late_finish && !task.late_start) {
      task.late_start = this.subtractDays(task.late_finish, task.duration);
    }

    // Calculate for predecessors
    for (const succ of task.successors) {
      const succTask = this.tasks.get(succ.successor_task_id);
      if (!succTask) continue;

      // Ensure successor is calculated first
      this.calculateLateDates(succ.successor_task_id, visited);

      if (!succTask.late_start) continue;

      const adjustedStart = this.adjustDateForDependencyTypeBackward(
        succTask.late_start,
        succTask.late_finish!,
        succ.dependency_type,
        succ.lag_time
      );

      if (!task.late_finish || adjustedStart.getTime() < task.late_finish.getTime()) {
        task.late_finish = adjustedStart;
        task.late_start = this.subtractDays(task.late_finish, task.duration);
      }
    }
  }

  /**
   * Calculate float times for all tasks
   */
  private calculateFloatTimes(): void {
    for (const task of this.tasks.values()) {
      if (task.early_start && task.late_start) {
        // Total float = Late Start - Early Start
        task.total_float = this.getDaysDifference(task.late_start, task.early_start);
        
        // Free float calculation
        task.free_float = this.calculateFreeFloat(task);
      }
    }
  }

  /**
   * Calculate free float for a task
   */
  private calculateFreeFloat(task: TaskNode): number {
    if (!task.early_finish || task.successors.length === 0) {
      return task.total_float || 0;
    }

    let minSuccessorEarlyStart = new Date(8640000000000000); // Max date

    for (const succ of task.successors) {
      const succTask = this.tasks.get(succ.successor_task_id);
      if (succTask && succTask.early_start) {
        const adjustedStart = this.adjustDateForDependencyType(
          task.early_finish,
          task.early_start!,
          succ.dependency_type,
          succ.lag_time
        );

        if (succTask.early_start.getTime() < minSuccessorEarlyStart.getTime()) {
          minSuccessorEarlyStart = succTask.early_start;
        }
      }
    }

    if (minSuccessorEarlyStart.getTime() === 8640000000000000) {
      return task.total_float || 0;
    }

    return this.getDaysDifference(minSuccessorEarlyStart, task.early_finish);
  }

  /**
   * Identify critical path tasks (tasks with zero total float)
   */
  private identifyCriticalPath(): number[] {
    const criticalTasks: number[] = [];

    for (const task of this.tasks.values()) {
      if ((task.total_float || 0) === 0) {
        task.is_critical_path = true;
        criticalTasks.push(task.task_id);
      } else {
        task.is_critical_path = false;
      }
    }

    return criticalTasks;
  }

  /**
   * Update tasks in database with calculated values
   */
  private async updateTasksInDatabase(): Promise<void> {
    const updatePromises = Array.from(this.tasks.values()).map(task =>
      prisma.task.update({
        where: { task_id: task.task_id },
        data: {
          early_start: task.early_start,
          early_finish: task.early_finish,
          late_start: task.late_start,
          late_finish: task.late_finish,
          total_float: task.total_float,
          free_float: task.free_float,
          is_critical_path: task.is_critical_path || false,
        },
      })
    );

    await Promise.all(updatePromises);
  }

  /**
   * Adjust date based on dependency type for forward pass
   */
  private adjustDateForDependencyType(
    predDate: Date,
    predStart: Date,
    depType: DependencyType,
    lagTime: number
  ): Date {
    let adjustedDate: Date;

    switch (depType) {
      case DependencyType.finish_to_start:
        adjustedDate = predDate; // Predecessor finish
        break;
      case DependencyType.start_to_start:
        adjustedDate = predStart; // Predecessor start
        break;
      case DependencyType.finish_to_finish:
        adjustedDate = predDate; // Predecessor finish
        break;
      case DependencyType.start_to_finish:
        adjustedDate = predStart; // Predecessor start
        break;
      default:
        adjustedDate = predDate;
    }

    return this.addDays(adjustedDate, lagTime);
  }

  /**
   * Adjust date based on dependency type for backward pass
   */
  private adjustDateForDependencyTypeBackward(
    succStart: Date,
    succFinish: Date,
    depType: DependencyType,
    lagTime: number
  ): Date {
    let adjustedDate: Date;

    switch (depType) {
      case DependencyType.finish_to_start:
        adjustedDate = succStart; // Successor start
        break;
      case DependencyType.start_to_start:
        adjustedDate = succStart; // Successor start
        break;
      case DependencyType.finish_to_finish:
        adjustedDate = succFinish; // Successor finish
        break;
      case DependencyType.start_to_finish:
        adjustedDate = succFinish; // Successor finish
        break;
      default:
        adjustedDate = succStart;
    }

    return this.subtractDays(adjustedDate, lagTime);
  }

  /**
   * Utility functions for date calculations
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  private getDaysDifference(laterDate: Date, earlierDate: Date): number {
    const timeDiff = laterDate.getTime() - earlierDate.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  }

  private calculateProjectDuration(): number {
    return this.getDaysDifference(this.projectEndDate, this.projectStartDate);
  }

  private getCriticalPathNames(criticalTaskIds: number[]): string[] {
    return criticalTaskIds.map(id => {
      const task = this.tasks.get(id);
      return task ? task.name : `Task ${id}`;
    });
  }
}

/**
 * Convenience function to calculate critical path for a project
 */
export async function calculateProjectCriticalPath(projectId: number) {
  const calculator = new CriticalPathCalculator();
  return await calculator.calculateCriticalPath(projectId);
}
