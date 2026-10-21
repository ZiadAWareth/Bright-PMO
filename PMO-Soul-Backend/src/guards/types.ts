
import { Request } from 'express';

/**
 * Extended Express Request interface with user information from JWT
 */
export interface AuthenticatedRequest extends Request {
  userId?: number;
  userRoleId?: number | null;
  userPermissions?: Record<string, any>;
  userEmail?: string;
  userUsername?: string;
  isPlatformAdmin?: boolean;
}
