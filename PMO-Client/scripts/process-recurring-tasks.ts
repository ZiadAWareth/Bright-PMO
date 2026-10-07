import { RecurringTaskService } from '@/lib/services/recurring-task.service';

async function main() {
  try {
    const recurringTaskService = RecurringTaskService.getInstance();
    await recurringTaskService.processRecurringTasks();
    console.log('✅ Recurring tasks processed successfully');
  } catch (error) {
    console.error('❌ Error processing recurring tasks:', error);
    process.exit(1);
  }
}

main(); 