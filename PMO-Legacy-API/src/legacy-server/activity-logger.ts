import { prisma } from './prisma';

// Activity types
export type ActivityAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'assign' 
  | 'unassign'
  | 'complete' 
  | 'start' 
  | 'pause' 
  | 'resume'
  | 'approve' 
  | 'reject'
  | 'submit'
  | 'archive'
  | 'restore'
  | 'escalate'
  | 'close'
  | 'reopen';

export type EntityType = 
  | 'project' 
  | 'task' 
  | 'risk' 
  | 'mitigation'
  | 'rfq' 
  | 'procurement'
  | 'contract'
  | 'budget'
  | 'document'
  | 'user'
  | 'team'
  | 'timesheet'
  | 'notification'
  | 'approval'
  | 'portfolio'
  | 'eps'
  | 'wbs'
  | 'resource'
  | 'vendor'
  | 'lesson'
  | 'baseline'
  | 'schedule'
  | 'inspection'
  | 'handover'
  | 'site'
  | 'equipment';

export interface ActivityMetadata {
  entity_name?: string;
  old_value?: any;
  new_value?: any;
  project_id?: number;
  project_name?: string;
  task_id?: number;
  task_name?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  vendor_name?: string;
  additional_info?: Record<string, any>;
}

export interface CreateActivityParams {
  user_id: number;
  action: ActivityAction;
  entity_type: EntityType;
  entity_id?: number;
  title: string;
  description?: string;
  metadata?: ActivityMetadata;
}

/**
 * Activity logging service
 */
export class ActivityLogger {
  /**
   * Log a new activity
   */
  static async log(params: CreateActivityParams): Promise<void> {
    try {
      await prisma.recentActivity.create({
        data: {
          user_id: params.user_id,
          action: params.action,
          entity_type: params.entity_type,
          entity_id: params.entity_id || null,
          title: params.title,
          description: params.description || null,
          metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : null,
        }
      });
    } catch (error) {
      // Log error but don't throw to avoid breaking the main operation
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Log project-related activities
   */
  static async logProjectActivity(
    user_id: number,
    action: ActivityAction,
    project_id: number,
    project_name: string,
    description?: string,
    metadata?: Partial<ActivityMetadata>
  ) {
    const title = `${this.getActionText(action)} project "${project_name}"`;
    
    await this.log({
      user_id,
      action,
      entity_type: 'project',
      entity_id: project_id,
      title,
      description,
      metadata: {
        entity_name: project_name,
        project_id,
        project_name,
        ...metadata
      }
    });
  }

  /**
   * Log task-related activities
   */
  static async logTaskActivity(
    user_id: number,
    action: ActivityAction,
    task_id: number,
    task_name: string,
    project_name?: string,
    description?: string,
    metadata?: Partial<ActivityMetadata>
  ) {
    const title = `${this.getActionText(action)} task "${task_name}"`;
    
    await this.log({
      user_id,
      action,
      entity_type: 'task',
      entity_id: task_id,
      title,
      description,
      metadata: {
        entity_name: task_name,
        task_id,
        task_name,
        project_name,
        ...metadata
      }
    });
  }

  /**
   * Log risk-related activities
   */
  static async logRiskActivity(
    user_id: number,
    action: ActivityAction,
    risk_id: number,
    risk_name: string,
    project_name?: string,
    description?: string,
    metadata?: Partial<ActivityMetadata>
  ) {
    const title = `${this.getActionText(action)} risk "${risk_name}"`;
    
    await this.log({
      user_id,
      action,
      entity_type: 'risk',
      entity_id: risk_id,
      title,
      description,
      metadata: {
        entity_name: risk_name,
        project_name,
        ...metadata
      }
    });
  }

  /**
   * Log RFQ-related activities
   */
  static async logRFQActivity(
    user_id: number,
    action: ActivityAction,
    rfq_id: number,
    rfq_description: string,
    vendor_name?: string,
    description?: string,
    metadata?: Partial<ActivityMetadata>
  ) {
    const title = `${this.getActionText(action)} RFQ "${rfq_description}"`;
    
    await this.log({
      user_id,
      action,
      entity_type: 'rfq',
      entity_id: rfq_id,
      title,
      description,
      metadata: {
        entity_name: rfq_description,
        vendor_name,
        ...metadata
      }
    });
  }

  /**
   * Log user assignment activities
   */
  static async logAssignmentActivity(
    user_id: number,
    action: 'assign' | 'unassign',
    entity_type: EntityType,
    entity_id: number,
    entity_name: string,
    assigned_to_id: number,
    assigned_to_name: string,
    description?: string,
    metadata?: Partial<ActivityMetadata>
  ) {
    const title = `${action === 'assign' ? 'Assigned' : 'Unassigned'} ${assigned_to_name} ${action === 'assign' ? 'to' : 'from'} ${entity_type} "${entity_name}"`;
    
    await this.log({
      user_id,
      action,
      entity_type,
      entity_id,
      title,
      description,
      metadata: {
        entity_name,
        assigned_to: assigned_to_id,
        assigned_to_name,
        ...metadata
      }
    });
  }

  /**
   * Log document-related activities
   */
  static async logDocumentActivity(
    user_id: number,
    action: ActivityAction,
    document_id: number,
    document_name: string,
    project_name?: string,
    description?: string,
    metadata?: Partial<ActivityMetadata>
  ) {
    const title = `${this.getActionText(action)} document "${document_name}"`;
    
    await this.log({
      user_id,
      action,
      entity_type: 'document',
      entity_id: document_id,
      title,
      description,
      metadata: {
        entity_name: document_name,
        project_name,
        ...metadata
      }
    });
  }

  /**
   * Log approval-related activities
   */
  static async logApprovalActivity(
    user_id: number,
    action: 'approve' | 'reject' | 'submit',
    entity_type: EntityType,
    entity_id: number,
    entity_name: string,
    description?: string,
    metadata?: Partial<ActivityMetadata>
  ) {
    const title = `${this.getActionText(action)} ${entity_type} "${entity_name}"`;
    
    await this.log({
      user_id,
      action,
      entity_type,
      entity_id,
      title,
      description,
      metadata: {
        entity_name,
        ...metadata
      }
    });
  }

  /**
   * Convert action to human-readable text
   */
  private static getActionText(action: ActivityAction): string {
    const actionMap: Record<ActivityAction, string> = {
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      assign: 'Assigned',
      unassign: 'Unassigned',
      complete: 'Completed',
      start: 'Started',
      pause: 'Paused',
      resume: 'Resumed',
      approve: 'Approved',
      reject: 'Rejected',
      submit: 'Submitted',
      archive: 'Archived',
      restore: 'Restored',
      escalate: 'Escalated',
      close: 'Closed',
      reopen: 'Reopened'
    };

    return actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1);
  }

  /**
   * Get recent activities for a user
   */
  static async getUserActivities(user_id: number, limit: number = 10) {
    return await prisma.recentActivity.findMany({
      where: { user_id },
      include: {
        user: {
          select: {
            username: true,
            account: {
              select: {
                first_name: true,
                last_name: true,
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit
    });
  }

  /**
   * Get all recent activities (admin only)
   */
  static async getAllActivities(limit: number = 20, offset: number = 0) {
    return await prisma.recentActivity.findMany({
      include: {
        user: {
          select: {
            username: true,
            account: {
              select: {
                first_name: true,
                last_name: true,
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * Clean up old activities (keep only last 1000 activities per user)
   */
  static async cleanupOldActivities(): Promise<void> {
    try {
      // Get all users
      const users = await prisma.user.findMany({
        select: { user_id: true }
      });

      for (const user of users) {
        // Get activities for this user, ordered by created_at desc
        const activities = await prisma.recentActivity.findMany({
          where: { user_id: user.user_id },
          orderBy: { created_at: 'desc' },
          select: { activity_id: true },
          skip: 1000 // Keep the first 1000 (most recent)
        });

        if (activities.length > 0) {
          // Delete the older activities
          await prisma.recentActivity.deleteMany({
            where: {
              activity_id: {
                in: activities.map(a => a.activity_id)
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old activities:', error);
    }
  }
}

// Export default instance
export const activityLogger = ActivityLogger;
