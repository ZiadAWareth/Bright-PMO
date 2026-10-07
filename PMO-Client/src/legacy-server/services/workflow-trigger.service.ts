import { prisma } from '../prisma';
import { WorkflowTriggerType, WorkflowActionType, TaskStatus } from '@prisma/client';

export class WorkflowTriggerService {
  /**
   * Process a task status change and check for matching workflow rules
   */
  static async processTaskStatusChange(taskId: number, newStatus: TaskStatus) {
    try {
      // Find all workflow rules that match this trigger type
      const rules = await prisma.workflowRule.findMany({
        where: {
          trigger_task_id: taskId,
          is_active: true,
          trigger_type: this.getTriggerTypeForStatus(newStatus),
        },
        include: {
          action_task: true,
        },
      });

      // Process each matching rule
      for (const rule of rules) {
        await this.executeWorkflowAction(rule);
      }
    } catch (error) {
      console.error('Error processing workflow trigger:', error);
      throw error;
    }
  }

  /**
   * Process a dependency completion and check for matching workflow rules
   */
  static async processDependencyCompletion(taskId: number) {
    try {
      // Find all workflow rules that match this trigger type
      const rules = await prisma.workflowRule.findMany({
        where: {
          trigger_task_id: taskId,
          is_active: true,
          trigger_type: WorkflowTriggerType.DEPENDENCY_COMPLETED,
        },
        include: {
          action_task: true,
        },
      });

      // Process each matching rule
      for (const rule of rules) {
        await this.executeWorkflowAction(rule);
      }
    } catch (error) {
      console.error('Error processing workflow trigger:', error);
      throw error;
    }
  }

  /**
   * Execute the action specified in the workflow rule
   */
  private static async executeWorkflowAction(rule: any) {
    try {
      switch (rule.action_type) {
        case WorkflowActionType.START_TASK:
          await this.startTask(rule.action_target_id);
          break;
        case WorkflowActionType.UPDATE_TASK_STATUS:
          await this.updateTaskStatus(rule.action_target_id);
          break;
        default:
          console.warn(`Unhandled action type: ${rule.action_type}`);
      }
    } catch (error) {
      console.error('Error executing workflow action:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate trigger type for a task status
   */
  private static getTriggerTypeForStatus(status: TaskStatus): WorkflowTriggerType {
    switch (status) {
      case TaskStatus.completed:
        return WorkflowTriggerType.TASK_COMPLETED;
      case TaskStatus.in_progress:
        return WorkflowTriggerType.TASK_STARTED;
      case TaskStatus.on_hold:
        return WorkflowTriggerType.TASK_ON_HOLD;
      default:
        throw new Error(`No trigger type defined for status: ${status}`);
    }
  }

  /**
   * Start a task by updating its status to in_progress
   */
  private static async startTask(taskId: number) {
    // Update the task status
    await prisma.task.update({
      where: { task_id: taskId },
      data: { status: TaskStatus.in_progress },
    });

    // After starting the task, process any rules that should be triggered by this status change
    await this.processTaskStatusChange(taskId, TaskStatus.in_progress);
  }

  /**
   * Update a task's status
   */
  private static async updateTaskStatus(taskId: number) {
    // Update the task status
    await prisma.task.update({
      where: { task_id: taskId },
      data: { status: TaskStatus.in_progress },
    });

    // After updating the task status, process any rules that should be triggered by this status change
    await this.processTaskStatusChange(taskId, TaskStatus.in_progress);
  }
} 