#!/usr/bin/env ts-node

/**
 * Manual script to create weekly timesheets
 * Usage: npm run create-timesheets
 * or: ts-node scripts/create-weekly-timesheets.ts
 */

import { TimesheetService } from '../lib/services/timesheet.service';

async function main() {
    console.log('🚀 Starting manual weekly timesheet creation...');
    
    try {
        const timesheetService = TimesheetService.getInstance();
        await timesheetService.createWeeklyTimesheets();
        console.log('✅ Manual timesheet creation completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during manual timesheet creation:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⚠️ Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️ Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

if (require.main === module) {
    main();
}
