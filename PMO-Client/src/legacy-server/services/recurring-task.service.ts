import { prisma } from '../prisma.ts';
import { RecurrenceFrequency, TaskStatus, TaskPriority } from '@prisma/client';
import { addDays, addMonths, addQuarters, addWeeks, addYears, isBefore } from 'date-fns';

export class RecurringTaskService {
  private static instance: RecurringTaskService;

  private constructor() {}

  public static getInstance(): RecurringTaskService {
    if (!RecurringTaskService.instance) {
      RecurringTaskService.instance = new RecurringTaskService();
    }
    return RecurringTaskService.instance;
  }

  /**
   * Get all recurring tasks
   */
  async getAllRecurringTasks() {
    try {
      return await prisma.recurringTask.findMany({
        include: {
          wbs: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    } catch (error) {
      console.error('Failed to fetch recurring tasks:', error);
      throw error;
    }
  }

  /**
   * Create a new recurring task
   */
  async createRecurringTask(data: {
    name: string;
    description?: string;
    wbs_id: number;
    frequency: RecurrenceFrequency;
    start_date: Date;
    end_date?: Date;
  }) {
    try {
      return await prisma.recurringTask.create({
        data: {
          name: data.name,
          description: data.description,
          wbs_id: data.wbs_id,
          frequency: data.frequency,
          start_date: data.start_date,
          end_date: data.end_date,
          is_active: true,
        },
        include: {
          wbs: true,
        },
      });
    } catch (error) {
      console.error('Failed to create recurring task:', error);
      throw error;
    }
  }

  /**
   * Process recurring tasks and create new tasks based on their frequency
   */
  async processRecurringTasks(): Promise<void> {
    try {
      const now = new Date();
      
      // Get active recurring tasks that need processing
      const recurringTasks = await prisma.recurringTask.findMany({
        where: {
          is_active: true,
          OR: [
            { last_created: null },
            {
              last_created: {
                lt: this.getNextExecutionDate(now, RecurrenceFrequency.DAILY),
              },
            },
          ],
          AND: [
            {
              OR: [
                { end_date: null },
                { end_date: { gt: now } },
              ],
            },
          ],
        },
        include: {
          wbs: true,
        },
      });

      for (const recurringTask of recurringTasks) {
        try {
          const nextExecutionDate = this.calculateNextExecutionDate(
            recurringTask.last_created || recurringTask.start_date,
            recurringTask.frequency
          );
          console.log("next execution date: ", nextExecutionDate)

          // Only create new task if next execution date is in the past
          if (isBefore(nextExecutionDate, now)) {
            // Create the new task
            await prisma.task.create({
              data: {
                name: recurringTask.name,
                description: recurringTask.description,
                wbs_id: recurringTask.wbs_id,
                start_date: nextExecutionDate,
                end_date: this.calculateEndDate(nextExecutionDate, recurringTask.frequency),
                duration: this.calculateDuration(recurringTask.frequency),
                progress_percentage: 0,
                is_milestone: false,
                is_critical_path: false,
                priority: TaskPriority.medium,
                status: TaskStatus.todo,
                created_by: 1, // TODO: Set this to the system user ID
              },
            });
            
            
            // Update last_created timestamp
            await prisma.recurringTask.update({
              where: { recurring_task_id: recurringTask.recurring_task_id },
              data: { last_created: nextExecutionDate },
            });

            console.log("recurring task last created updated to: ", nextExecutionDate)
          }
        } catch (error) {
          console.error(`Failed to process recurring task ${recurringTask.recurring_task_id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to process recurring tasks:', error);
      throw error;
    }
  }

  /**
   * Calculate the next execution date based on frequency
   */
  private calculateNextExecutionDate(lastDate: Date, frequency: RecurrenceFrequency): Date {
    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        return addDays(lastDate, 1);
      case RecurrenceFrequency.WEEKLY:
        return addWeeks(lastDate, 1);
      case RecurrenceFrequency.MONTHLY:
        return addMonths(lastDate, 1);
      case RecurrenceFrequency.QUARTERLY:
        return addQuarters(lastDate, 1);
      case RecurrenceFrequency.YEARLY:
        return addYears(lastDate, 1);
      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }
  }

  /**
   * Calculate the end date for a task based on frequency
   */
  private calculateEndDate(startDate: Date, frequency: RecurrenceFrequency): Date {
    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        return addDays(startDate, 1);
      case RecurrenceFrequency.WEEKLY:
        return addWeeks(startDate, 1);
      case RecurrenceFrequency.MONTHLY:
        return addMonths(startDate, 1);
      case RecurrenceFrequency.QUARTERLY:
        return addQuarters(startDate, 1);
      case RecurrenceFrequency.YEARLY:
        return addYears(startDate, 1);
      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }
  }

  /**
   * Calculate task duration in days based on frequency
   */
  private calculateDuration(frequency: RecurrenceFrequency): number {
    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        return 1;
      case RecurrenceFrequency.WEEKLY:
        return 7;
      case RecurrenceFrequency.MONTHLY:
        return 30;
      case RecurrenceFrequency.QUARTERLY:
        return 90;
      case RecurrenceFrequency.YEARLY:
        return 365;
      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }
  }

  /**
   * Get the next execution date for a given frequency
   */
  private getNextExecutionDate(date: Date, frequency: RecurrenceFrequency): Date {
    return this.calculateNextExecutionDate(date, frequency);
  }
} 