// Import the cron library for scheduling tasks
import cron from "node-cron";
import { sendReminders, notifyAndEscalate } from "./entities";

// Schedule a cron job to run every day at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("Running scheduled tasks...");

  // Send reminders for mitigation actions due soon
  await sendReminders();

  // Notify and escalate overdue mitigation actions
  await notifyAndEscalate();
});