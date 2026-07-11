import { prisma } from './prisma';

export async function findMatchingTimesheet(
    project_id: number,
    user_id: number,
    date: Date
): Promise<{ timesheet_id: number } | null> {
    // Find a timesheet where:
    // 1. The project matches
    // 2. The user matches
    // 3. The date falls between start_date and end_date
    // 4. The status is DRAFT or SUBMITTED
    const timesheet = await prisma.timesheet.findFirst({
        where: {
            project_id,
            user_id,
            start_date: {
                lte: date
            },
            end_date: {
                gte: date
            },
            status: {
                in: ['DRAFT', 'SUBMITTED']
            }
        },
        select: {
            timesheet_id: true
        }
    });

    return timesheet;
} 