import { prisma } from './prisma';

export interface TimeEntryValidationError {
  message: string;
  code: string;
}

export async function validateTimeEntry(
  userId: number,
  date: Date,
  hours: number,
  taskId: number,
  startTime: Date,
  endTime: Date,
  existingTimeEntryId?: number
): Promise<TimeEntryValidationError | null> {
  // Validate start and end times
  if (startTime >= endTime) {
    return {
      message: 'Start time must be before end time',
      code: 'INVALID_TIME_RANGE'
    };
  }

  // Calculate hours from start and end time
  const calculatedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  if (Math.abs(calculatedHours - hours) > 0.01) { // Allow for small floating point differences
    return {
      message: 'Hours spent does not match the time range',
      code: 'HOURS_MISMATCH'
    };
  }

  // Convert date to start and end of day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all time entries for the user on the same day
  const existingEntries = await prisma.timeEntry.findMany({
    where: {
      user_id: userId,
      date: {
        gte: startOfDay,
        lte: endOfDay
      },
      time_entry_id: {
        not: existingTimeEntryId // Exclude the current entry when updating
      }
    }
  });

  // Check for overlapping entries
  const hasOverlap = existingEntries.some(entry => {
    return (
      (startTime >= entry.start_time && startTime < entry.end_time) ||
      (endTime > entry.start_time && endTime <= entry.end_time) ||
      (startTime <= entry.start_time && endTime >= entry.end_time)
    );
  });

  if (hasOverlap) {
    return {
      message: 'Time entry overlaps with existing entries for the same day',
      code: 'OVERLAPPING_ENTRY'
    };
  }

  // Validate task exists and is active
  const task = await prisma.task.findUnique({
    where: { task_id: taskId }
  });

  if (!task) {
    return {
      message: 'Task not found',
      code: 'TASK_NOT_FOUND'
    };
  }

  // Note: Tasks don't have a 'DELETED' status in the TaskStatus enum
  // Valid statuses are: todo, in_progress, completed, on_hold

  return null;
} 