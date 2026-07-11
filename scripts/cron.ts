import cron from 'node-cron';
import { RecurringTaskService } from '../lib/services/recurring-task.service.ts';
import { TimesheetService } from '../lib/services/timesheet.service.ts';

// Run every minute for recurring tasks
cron.schedule('*/1 * * * *', async () => {
  console.log('🕒 Running recurring task processor...');
  try {
    const recurringTaskService = RecurringTaskService.getInstance();
    await recurringTaskService.processRecurringTasks();
    console.log('✅ Recurring tasks processed successfully');
  } catch (error) {
    console.error('❌ Error processing recurring tasks:', error);
  }
});

// Run every Sunday at 12:01 AM for weekly timesheet creation
cron.schedule('1 0 * * 0', async () => {
  console.log('� Running weekly timesheet creation...');
  try {
    const timesheetService = TimesheetService.getInstance();
    await timesheetService.createWeeklyTimesheets();
    console.log('✅ Weekly timesheets created successfully');
  } catch (error) {
    console.error('❌ Error creating weekly timesheets:', error);
  }
});

// Run monthly cleanup on the 1st day of each month at 2:00 AM
cron.schedule('0 2 1 * *', async () => {
  console.log('🧹 Running monthly timesheet cleanup...');
  try {
    const timesheetService = TimesheetService.getInstance();
    await timesheetService.cleanupOldDraftTimesheets();
    console.log('✅ Monthly timesheet cleanup completed');
  } catch (error) {
    console.error('❌ Error during timesheet cleanup:', error);
  }
});

console.log('🚀 Cron jobs started:');
console.log('  - Recurring tasks: Every minute');
console.log('  - Weekly timesheets: Every Sunday at 12:01 AM');
console.log('  - Monthly cleanup: 1st day of month at 2:00 AM'); 