import { prisma } from '@/lib/prisma';
import { DependencyType } from '@prisma/client';

interface TaskCPM {
  task_id: number;
  name: string;
  start_date: Date;
  end_date: Date;
  duration: number;
  early_start: Date;
  early_finish: Date;
  late_start: Date;
  late_finish: Date;
  total_float: number;
  free_float: number;
  is_critical_path: boolean;
  predecessors: Array<{
    predecessor_task_id: number;
    dependency_type: DependencyType;
    lag_time: number;
  }>;
  successors: Array<{
    successor_task_id: number;
    dependency_type: DependencyType;
    lag_time: number;
  }>;
}

export class CriticalPathService {
  /**
   * Calculate critical path for all tasks in a project
   */
  static async calculateCriticalPath(projectId: number): Promise<TaskCPM[]> {
    try {
      console.log(`🔍 Starting critical path calculation for project ${projectId}`);
        // FIXED: Load tasks and dependencies separately to avoid Prisma bidirectional relationship bug
      // Get all tasks for the project (without includes to avoid corruption)
      const tasks = await prisma.task.findMany({
        where: {
          wbs: {
            project_id: projectId
          }
        },
        orderBy: {
          start_date: 'asc'
        }
      });

      console.log(`📊 Found ${tasks.length} tasks for project ${projectId}`);

      if (tasks.length === 0) {
        console.log('⚠️ No tasks found for project');
        return [];
      }

      // Get all dependencies for tasks in this project separately
      const taskIds = tasks.map(t => t.task_id);
      const dependencies = await prisma.taskDependency.findMany({
        where: {
          OR: [
            { predecessor_task_id: { in: taskIds } },
            { successor_task_id: { in: taskIds } }
          ]
        }
      });

      console.log(`🔗 Found ${dependencies.length} dependencies for project ${projectId}`);

      // Build dependency maps manually to avoid Prisma corruption
      const predecessorMap = new Map<number, Array<{
        predecessor_task_id: number;
        dependency_type: DependencyType;
        lag_time: number;
      }>>();
      
      const successorMap = new Map<number, Array<{
        successor_task_id: number;
        dependency_type: DependencyType;
        lag_time: number;
      }>>();

      // Initialize maps for all tasks
      taskIds.forEach(taskId => {
        predecessorMap.set(taskId, []);
        successorMap.set(taskId, []);
      });

      // Populate dependency maps
      dependencies.forEach(dep => {
        // Add to predecessor map (task -> its predecessors)
        if (taskIds.includes(dep.successor_task_id)) {
          const predecessors = predecessorMap.get(dep.successor_task_id) || [];
          predecessors.push({
            predecessor_task_id: dep.predecessor_task_id,
            dependency_type: dep.dependency_type,
            lag_time: dep.lag_time || 0
          });
          predecessorMap.set(dep.successor_task_id, predecessors);
        }

        // Add to successor map (task -> its successors)
        if (taskIds.includes(dep.predecessor_task_id)) {
          const successors = successorMap.get(dep.predecessor_task_id) || [];
          successors.push({
            successor_task_id: dep.successor_task_id,
            dependency_type: dep.dependency_type,
            lag_time: dep.lag_time || 0
          });
          successorMap.set(dep.predecessor_task_id, successors);
        }
      });

      console.log('✅ Successfully built correct task dependency structure');

      // Convert to CPM format with properly structured dependencies
      const cpmTasks: TaskCPM[] = tasks.map(task => {
        const duration = task.duration || this.calculateDurationInDays(task.start_date, task.end_date);
        
        return {
          task_id: task.task_id,
          name: task.name,
          start_date: task.start_date,
          end_date: task.end_date,
          duration: duration,
          early_start: task.start_date,
          early_finish: task.end_date,
          late_start: task.start_date,
          late_finish: task.end_date,
          total_float: 0,
          free_float: 0,
          is_critical_path: false,
          predecessors: predecessorMap.get(task.task_id) || [],
          successors: successorMap.get(task.task_id) || []
        };
      });

      console.log(`🧮 Converted ${cpmTasks.length} tasks to CPM format`);
      console.log('📋 CPM DEBUG - Input from DB (task_id, duration, start_date, end_date, predecessors, successors):');
      cpmTasks.forEach((t) => {
        const predIds = t.predecessors.map((p) => p.predecessor_task_id).join(',');
        const succIds = t.successors.map((s) => s.successor_task_id).join(',');
        console.log(`   ${t.name} (ID:${t.task_id}) duration=${t.duration}d start=${this.fmt(t.start_date)} end=${this.fmt(t.end_date)} preds=[${predIds}] succs=[${succIds}]`);
      });

      console.log('📈 Starting CPM calculations...');

      // Step 1: Forward Pass - Calculate Early Start and Early Finish
      await this.forwardPass(cpmTasks);
      console.log('✅ Forward pass completed');
      console.log('📋 CPM DEBUG - After forward pass:');
      cpmTasks.forEach((t) => {
        console.log(`   ${t.name} (ID:${t.task_id})  early_start=${this.fmt(t.early_start)}  early_finish=${this.fmt(t.early_finish)}  duration=${t.duration}d  stored end_date=${this.fmt(t.end_date)}`);
      });

      // Step 1b: Apply stored end_date for terminal tasks and propagate backward so user-set dates drive critical path
      this.applyEndDatesAndPropagateBackward(cpmTasks);
      console.log('📋 CPM DEBUG - After applyEndDates (terminal stretch + backward propagate):');
      cpmTasks.forEach((t) => {
        console.log(`   ${t.name} (ID:${t.task_id})  early_start=${this.fmt(t.early_start)}  early_finish=${this.fmt(t.early_finish)}`);
      });

      // Step 2: Backward Pass - Calculate Late Start and Late Finish
      await this.backwardPass(cpmTasks);
      console.log('✅ Backward pass completed');

      // Step 3: Calculate Float and identify Critical Path
      await this.calculateFloat(cpmTasks);
      console.log('✅ Float calculation completed');
      console.log('📋 CPM DEBUG - Float & critical path:');
      cpmTasks.forEach((t) => {
        console.log(`   ${t.name} (ID:${t.task_id})  total_float=${t.total_float}d  is_critical_path=${t.is_critical_path}  late_start=${this.fmt(t.late_start)}  late_finish=${this.fmt(t.late_finish)}`);
      });

      // Step 4: Update database with calculated values
      await this.updateTasksInDatabase(cpmTasks);
      console.log('✅ Database update completed');

      const criticalTasks = cpmTasks.filter(t => t.is_critical_path);
      console.log(`🎯 Critical path calculation completed. ${criticalTasks.length} critical tasks found.`);
      if (criticalTasks.length > 0) {
        console.log('📋 CPM DEBUG - Critical path: ' + criticalTasks.map((t) => t.name + '(ID:' + t.task_id + ')').join(' → '));
      }

      return cpmTasks;
    } catch (error) {
      console.error('❌ Critical path calculation failed:', error);
      throw new Error(`Critical path calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate duration in days between two dates
   */
  private static calculateDurationInDays(startDate: Date, endDate: Date): number {
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return diffDays;
  }

  /**
   * Forward Pass: Calculate Early Start and Early Finish dates
   */
  private static async forwardPass(tasks: TaskCPM[]): Promise<void> {
    // Create a map for quick lookup
    const taskMap = new Map<number, TaskCPM>();
    tasks.forEach(task => taskMap.set(task.task_id, task));

    // Sort tasks topologically (tasks with no predecessors first)
    const sorted = this.topologicalSort(tasks);

    for (const task of sorted) {
      if (task.predecessors.length === 0) {
        // No predecessors - use planned start date
        task.early_start = new Date(task.start_date);
      } else {
        // Calculate based on predecessors
        let maxEarlyFinish = new Date(task.start_date); // Use task start as minimum
        
        for (const pred of task.predecessors) {
          const predecessorTask = taskMap.get(pred.predecessor_task_id);
          if (predecessorTask) {
            const finishDate = this.calculateDependencyDate(
              predecessorTask,
              pred.dependency_type,
              pred.lag_time,
              'forward'
            );
            
            if (finishDate > maxEarlyFinish) {
              maxEarlyFinish = finishDate;
            }
          }
        }
        
        task.early_start = maxEarlyFinish;
      }

      // Calculate Early Finish based on Early Start + Duration
      task.early_finish = this.addDays(task.early_start, task.duration);
    }
  }

  /**
   * After forward pass: apply stored end_date for terminal tasks and propagate backward
   * so that user-set end dates can drive the critical path (chain ending on project end).
   */
  private static applyEndDatesAndPropagateBackward(tasks: TaskCPM[]): void {
    const taskMap = new Map<number, TaskCPM>();
    tasks.forEach(t => taskMap.set(t.task_id, t));
    const backwardOrder = this.getBackwardPassOrder(tasks);

    console.log('📋 CPM DEBUG - applyEndDatesAndPropagateBackward order: ' + backwardOrder.map((t) => t.name).join(' → '));

    for (const task of backwardOrder) {
      if (task.successors.length === 0) {
        // Terminal task: extend to stored end_date if later than computed early_finish
        if (task.end_date.getTime() > task.early_finish.getTime()) {
          const prevFinish = this.fmt(task.early_finish);
          task.early_finish = new Date(task.end_date.getTime());
          task.early_start = this.subtractDays(task.early_finish, task.duration);
          console.log(`   [terminal] ${task.name}: extended early_finish ${prevFinish} → ${this.fmt(task.early_finish)} (stored end_date)`);
        } else {
          console.log(`   [terminal] ${task.name}: no change (early_finish ${this.fmt(task.early_finish)} already >= end_date ${this.fmt(task.end_date)})`);
        }
      } else {
        // Predecessor: must finish by earliest successor's early_start so chain is tight to terminal end_date
        let minFinishBy = new Date(8640000000000000);
        for (const succ of task.successors) {
          const successorTask = taskMap.get(succ.successor_task_id);
          if (!successorTask) continue;
          // For finish_to_start: predecessor must finish by successor.early_start - lag
          const finishBy = succ.lag_time
            ? this.subtractDays(successorTask.early_start, succ.lag_time)
            : new Date(successorTask.early_start.getTime());
          if (finishBy.getTime() < minFinishBy.getTime()) minFinishBy = finishBy;
        }
        const prevFinish = this.fmt(task.early_finish);
        task.early_finish = new Date(minFinishBy.getTime());
        task.early_start = this.subtractDays(task.early_finish, task.duration);
        console.log(`   [propagate] ${task.name}: early_finish ${prevFinish} → ${this.fmt(task.early_finish)} (must finish by successor(s) start)`);
      }
    }
  }

  /**
   * Backward Pass: Calculate Late Start and Late Finish dates
   */
  private static async backwardPass(tasks: TaskCPM[]): Promise<void> {
    const taskMap = new Map<number, TaskCPM>();
    tasks.forEach(task => taskMap.set(task.task_id, task));

    // Project end = latest of CPM early_finish and stored end_date (so user-set dates can drive critical path)
    const latestEarlyFinish = Math.max(...tasks.map(t => t.early_finish.getTime()));
    const latestStoredEnd = Math.max(...tasks.map(t => t.end_date.getTime()));
    const projectEndDate = new Date(Math.max(latestEarlyFinish, latestStoredEnd));

    console.log('📋 CPM DEBUG - Backward pass:');
    console.log(`   projectEndDate=${this.fmt(projectEndDate)}  (latestEarlyFinish=${this.fmt(new Date(latestEarlyFinish))}  latestStoredEnd=${this.fmt(new Date(latestStoredEnd))})`);

    // Process in strict order: only after ALL successors have been processed (so late_start is set)
    const backwardOrder = this.getBackwardPassOrder(tasks);
    console.log(`   backward order: ${backwardOrder.map((t) => t.name + '(ID:' + t.task_id + ')').join(' → ')}`);

    for (const task of backwardOrder) {
      if (task.successors.length === 0) {
        // No successors - use project end date so only the path that drives the end date has zero float
        task.late_finish = new Date(projectEndDate.getTime());
        console.log(`   [backward] ${task.name} (ID:${task.task_id}) terminal → late_finish=${this.fmt(task.late_finish)} late_start=${this.fmt(this.subtractDays(task.late_finish, task.duration))}`);
      } else {
        // Calculate based on successors
        let minLateStart = new Date(8640000000000000); // Max date value
        let fromSuccessor = '';

        for (const succ of task.successors) {
          const successorTask = taskMap.get(succ.successor_task_id);
          if (successorTask) {
            const startDate = this.calculateDependencyDate(
              successorTask,
              succ.dependency_type,
              succ.lag_time,
              'backward'
            );
            if (startDate < minLateStart) {
              minLateStart = startDate;
              fromSuccessor = ` from ${successorTask.name}(ID:${successorTask.task_id}).late_start=${this.fmt(successorTask.late_start)}`;
            }
          }
        }

        task.late_finish = minLateStart;
        console.log(`   [backward] ${task.name} (ID:${task.task_id}) has successors → late_finish=${this.fmt(task.late_finish)}${fromSuccessor}`);
      }

      // Calculate Late Start based on Late Finish - Duration
      task.late_start = this.subtractDays(task.late_finish, task.duration);
    }
  }

  /**
   * Calculate Float values and identify critical path
   */
  private static async calculateFloat(tasks: TaskCPM[]): Promise<void> {
    const taskMap = new Map<number, TaskCPM>();
    tasks.forEach(task => taskMap.set(task.task_id, task));

    for (const task of tasks) {
      // Total Float = Late Start - Early Start (in days)
      task.total_float = this.daysBetween(task.early_start, task.late_start);
      console.log(`   [float] ${task.name} (ID:${task.task_id}) early_start=${this.fmt(task.early_start)} late_start=${this.fmt(task.late_start)} → total_float=${task.total_float}d`);
      
      // Free Float calculation
      if (task.successors.length === 0) {
        task.free_float = task.total_float;
      } else {
        let minSuccessorEarlyStart = new Date(8640000000000000); // Max date
        
        for (const succ of task.successors) {
          const successorTask = taskMap.get(succ.successor_task_id);
          if (successorTask) {
            if (successorTask.early_start < minSuccessorEarlyStart) {
              minSuccessorEarlyStart = successorTask.early_start;
            }
          }
        }
        
        const freeFloat = this.daysBetween(task.early_finish, minSuccessorEarlyStart);
        task.free_float = Math.max(0, Math.min(task.total_float, freeFloat));
      }

      // Critical path: tasks with zero or negative total float
      task.is_critical_path = task.total_float <= 0;
    }
  }

  /**
   * Update tasks in database with calculated CPM values
   */
  private static async updateTasksInDatabase(tasks: TaskCPM[]): Promise<void> {
    console.log(`💾 Updating ${tasks.length} tasks in database...`);
    console.log('📋 CPM DEBUG - Values we are writing to DB:');
    tasks.forEach((t) => {
      console.log(`   WRITE task_id=${t.task_id} ${t.name} | early_start=${this.fmt(t.early_start)} early_finish=${this.fmt(t.early_finish)} late_start=${this.fmt(t.late_start)} late_finish=${this.fmt(t.late_finish)} total_float=${t.total_float} is_critical_path=${t.is_critical_path}`);
    });

    // Use Prisma task.update() so Date serialization and updated_at are handled correctly;
    // raw SQL can fail silently with Date params and doesn't set updated_at.
    const updatePromises = tasks.map(async (task) => {
      try {
        await prisma.task.update({
          where: { task_id: task.task_id },
          data: {
            early_start: task.early_start,
            early_finish: task.early_finish,
            late_start: task.late_start,
            late_finish: task.late_finish,
            total_float: task.total_float,
            free_float: task.free_float,
            is_critical_path: task.is_critical_path,
          },
        });
      } catch (error) {
        console.error(`❌ Error updating task ${task.task_id} (${task.name}):`, error);
        throw error;
      }
    });

    await Promise.all(updatePromises);
    console.log('✅ Database updates completed');
  }

  /**
   * Calculate dependency dates based on dependency type
   */
  private static calculateDependencyDate(
    task: TaskCPM,
    dependencyType: DependencyType,
    lagTime: number,
    direction: 'forward' | 'backward'
  ): Date {
    let baseDate: Date;

    if (direction === 'forward') {
      switch (dependencyType) {
        case DependencyType.finish_to_start:
          baseDate = task.early_finish;
          break;
        case DependencyType.start_to_start:
          baseDate = task.early_start;
          break;
        case DependencyType.finish_to_finish:
          baseDate = task.early_finish;
          break;
        case DependencyType.start_to_finish:
          baseDate = task.early_start;
          break;
        default:
          baseDate = task.early_finish;
      }
    } else {
      switch (dependencyType) {
        case DependencyType.finish_to_start:
          baseDate = task.late_start;
          break;
        case DependencyType.start_to_start:
          baseDate = task.late_start;
          break;
        case DependencyType.finish_to_finish:
          baseDate = task.late_finish;
          break;
        case DependencyType.start_to_finish:
          baseDate = task.late_finish;
          break;
        default:
          baseDate = task.late_start;
      }
    }

    return this.addDays(baseDate, lagTime);
  }

  /**
   * Topological sort of tasks based on dependencies
   */
  private static topologicalSort(tasks: TaskCPM[]): TaskCPM[] {
    const visited = new Set<number>();
    const visiting = new Set<number>();
    const result: TaskCPM[] = [];
    const taskMap = new Map<number, TaskCPM>();
    
    tasks.forEach(task => taskMap.set(task.task_id, task));

    const visit = (task: TaskCPM): boolean => {
      if (visiting.has(task.task_id)) {
        console.warn(`⚠️ Circular dependency detected for task ${task.task_id}: ${task.name}`);
        return false; // Circular dependency detected
      }
      
      if (visited.has(task.task_id)) {
        return true;
      }
      
      visiting.add(task.task_id);
      
      // Visit all predecessors first
      for (const pred of task.predecessors) {
        const predecessorTask = taskMap.get(pred.predecessor_task_id);
        if (predecessorTask && !visit(predecessorTask)) {
          return false;
        }
      }
      
      visiting.delete(task.task_id);
      visited.add(task.task_id);
      result.push(task);
      return true;
    };

    // Visit all tasks
    for (const task of tasks) {
      if (!visited.has(task.task_id)) {
        visit(task);
      }
    }

    return result;
  }

  /**
   * Order for backward pass: each task is processed only after all its successors.
   * Guarantees that when we set late_finish from successor's late_start, that successor is already computed.
   */
  private static getBackwardPassOrder(tasks: TaskCPM[]): TaskCPM[] {
    const taskMap = new Map<number, TaskCPM>();
    tasks.forEach(t => taskMap.set(t.task_id, t));
    const result: TaskCPM[] = [];
    const added = new Set<number>();
    const remaining = new Set(tasks.map(t => t.task_id));

    while (result.length < tasks.length) {
      let foundAny = false;
      for (const task of tasks) {
        if (added.has(task.task_id)) continue;
        const successorsStillRemaining = task.successors.filter(s => remaining.has(s.successor_task_id));
        if (successorsStillRemaining.length === 0) {
          result.push(task);
          added.add(task.task_id);
          remaining.delete(task.task_id);
          foundAny = true;
        }
      }
      if (!foundAny) break;
    }
    return result;
  }

  /**
   * Utility: Add days to a date
   */
  private static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Utility: Subtract days from a date
   */
  private static subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  /** Format date for debug logs (YYYY-MM-DD) */
  private static fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /**
   * Utility: Calculate days between two dates (calendar-day based so same day = 0 float).
   * Normalizing to start of day avoids marking a task non-critical when early_start and
   * late_start are the same calendar day but different times.
   */
  private static daysBetween(date1: Date, date2: Date): number {
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const d1 = startOfDay(date1).getTime();
    const d2 = startOfDay(date2).getTime();
    if (d2 <= d1) return 0;
    const diffDays = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Trigger recalculation when task dates or dependencies change
   */
  static async recalculateForProject(projectId: number): Promise<void> {
    console.log(`🔄 Recalculating critical path for project ${projectId}`);
    await this.calculateCriticalPath(projectId);
    await this.notifyCriticalPathChanges(projectId);
  }

  /**
   * Send notifications for critical path changes
   */
  private static async notifyCriticalPathChanges(projectId: number): Promise<void> {
    try {
      const criticalTasks = await prisma.task.findMany({
        where: {
          is_critical_path: true,
          wbs: {
            project_id: projectId
          }
        },
        include: {
          assigned_users: {
            include: {
              user: true
            }
          }
        }
      });

      console.log(`📧 Sending notifications for ${criticalTasks.length} critical tasks`);

      // Create notifications for users assigned to critical path tasks
      const notificationPromises = [];
      
      for (const task of criticalTasks) {
        for (const assignment of task.assigned_users) {
          notificationPromises.push(
            prisma.notification.create({
              data: {
                user_id: assignment.user_id,
                type: "TASK_UPDATE",
                title: "Critical Path Alert",
                message: `Task "${task.name}" is on the critical path. Any delay will impact project completion.`,
                priority: "HIGH",
                created_by_id: 1, // System user
                metadata: {
                  project_id: projectId,
                  task_id: task.task_id,
                  is_critical_path: true
                }
              }
            })
          );
        }
      }

      await Promise.all(notificationPromises);
      console.log('✅ Notifications sent successfully');
    } catch (error) {
      console.error('❌ Error sending notifications:', error);
    }
  }
}
