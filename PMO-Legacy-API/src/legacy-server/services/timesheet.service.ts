import { prisma } from '../prisma';

export class TimesheetService {
  private static instance: TimesheetService;

  public static getInstance(): TimesheetService {
    if (!TimesheetService.instance) {
      TimesheetService.instance = new TimesheetService();
    }
    return TimesheetService.instance;
  }

  /**
   * Creates weekly timesheets for all active users on Sundays
   * This should be called once per week (every Sunday at midnight)
   */
  async createWeeklyTimesheets(): Promise<void> {
    console.log('🕒 Starting weekly timesheet creation process...');
    
    try {
      // Get the current Sunday (start of week) and next Saturday (end of week)
      const { weekStart, weekEnd } = this.getCurrentWeekDates();
      
      console.log(`📅 Creating timesheets for week: ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);

      // Get all active users
      const activeUsers = await this.getActiveUsers();
      console.log(`👥 Found ${activeUsers.length} active users`);

      // Get all active projects
      const activeProjects = await this.getActiveProjects();
      console.log(`📋 Found ${activeProjects.length} active projects`);

      if (activeProjects.length === 0) {
        console.log('⚠️ No active projects found, skipping timesheet creation');
        return;
      }

      let createdCount = 0;
      let skippedCount = 0;

      // Create timesheets for each user for each active project they're involved in
      for (const user of activeUsers) {
        // Get projects where user is involved (as PM, team member, or has resource assignments)
        const userProjects = await this.getUserActiveProjects(user.user_id, activeProjects);
        
        for (const project of userProjects) {
          // Check if timesheet already exists for this user, project, and week
          const existingTimesheet = await this.checkExistingTimesheet(
            user.user_id,
            project.project_id,
            weekStart,
            weekEnd
          );

          if (existingTimesheet) {
            console.log(`⏭️ Timesheet already exists for user ${user.user_id} on project ${project.project_id}`);
            skippedCount++;
            continue;
          }

          // Create new timesheet
          await this.createTimesheet(user.user_id, project.project_id, weekStart, weekEnd);
          createdCount++;
          
          console.log(`✅ Created timesheet for user ${user.email} on project "${project.name}"`);
        }
      }

      console.log(`🎉 Weekly timesheet creation completed: ${createdCount} created, ${skippedCount} skipped`);
    } catch (error) {
      console.error('❌ Error creating weekly timesheets:', error);
      throw error;
    }
  }

  /**
   * Get the current week's start (Sunday) and end (Saturday) dates
   */
  private getCurrentWeekDates(): { weekStart: Date; weekEnd: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate start of week (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    // Calculate end of week (Saturday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { weekStart, weekEnd };
  }

  /**
   * Get all active users who should receive timesheets
   */
  private async getActiveUsers() {
    return await prisma.user.findMany({
      where: {
        // Add conditions for active users
        // You might want to add a status field to users table
        account: {
          isNot: null // Ensure user has an account
        }
      },
      select: {
        user_id: true,
        email: true,
        account: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      }
    });
  }

  /**
   * Get all active projects
   */
  private async getActiveProjects() {
    return await prisma.project.findMany({
      where: {
        status: {
          in: ['execution', 'planning'] // Using correct ProjectStatus enum values
        }
      },
      select: {
        project_id: true,
        name: true,
        manager_id: true // Correct field name
      }
    });
  }

  /**
   * Get projects where a specific user is involved
   */
  private async getUserActiveProjects(userId: number, activeProjects: any[]) {
    // Get projects where user is project manager
    const pmProjects = activeProjects.filter(p => p.manager_id === userId);
    
    // Get projects where user has resource assignments
    const resourceAssignments = await prisma.resourceAssignment.findMany({
      where: {
        resource_id: userId,
        task: {
          wbs: {
            project: {
              status: {
                in: ['execution', 'planning'] // Using correct ProjectStatus enum values
              }
            }
          }
        }
      },
      include: {
        task: {
          include: {
            wbs: {
              include: {
                project: true
              }
            }
          }
        }
      }
    });

    const assignedProjects = resourceAssignments.map(ra => ({
      project_id: ra.task.wbs.project.project_id,
      name: ra.task.wbs.project.name,
      manager_id: ra.task.wbs.project.manager_id // Correct field name
    }));

    // Combine and deduplicate projects
    const allUserProjects = [...pmProjects, ...assignedProjects];
    const uniqueProjects = allUserProjects.filter((project, index, self) =>
      index === self.findIndex(p => p.project_id === project.project_id)
    );

    return uniqueProjects;
  }

  /**
   * Check if timesheet already exists for user, project, and week
   */
  private async checkExistingTimesheet(
    userId: number,
    projectId: number,
    weekStart: Date,
    weekEnd: Date
  ) {
    return await prisma.timesheet.findFirst({
      where: {
        user_id: userId,
        project_id: projectId,
        start_date: {
          gte: weekStart,
          lt: new Date(weekStart.getTime() + 24 * 60 * 60 * 1000) // Within Sunday
        }
      }
    });
  }

  /**
   * Create a new timesheet
   */
  private async createTimesheet(
    userId: number,
    projectId: number,
    weekStart: Date,
    weekEnd: Date
  ) {
    return await prisma.timesheet.create({
      data: {
        user_id: userId,
        project_id: projectId,
        start_date: weekStart,
        end_date: weekEnd,
        status: 'DRAFT',
        total_hours: 0,
        comments: '',
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  /**
   * Cleanup old draft timesheets (optional - run monthly)
   * Removes draft timesheets older than 4 weeks with no time entries
   */
  async cleanupOldDraftTimesheets(): Promise<void> {
    console.log('🧹 Starting cleanup of old draft timesheets...');
    
    try {
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const deletedTimesheets = await prisma.timesheet.deleteMany({
        where: {
          status: 'DRAFT',
          created_at: {
            lt: fourWeeksAgo
          },
          total_hours: 0,
          time_entries: {
            none: {} // No time entries
          }
        }
      });

      console.log(`🗑️ Cleaned up ${deletedTimesheets.count} old draft timesheets`);
    } catch (error) {
      console.error('❌ Error cleaning up old timesheets:', error);
      throw error;
    }
  }
}
