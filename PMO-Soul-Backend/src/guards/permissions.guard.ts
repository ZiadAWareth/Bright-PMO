
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './types';
import { assertFeature } from './features';

// Decorator to specify required permission
export const RequirePermission = (entity: string, operation: string) =>
  SetMetadata('permission', { entity, operation });

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Feature access (@RequireFeature, src/guards/features.ts): an on/off switch on the role, for
    // screens that are used or not rather than created/read/updated/deleted. Checked first and on
    // its own: a route gated by a feature need not also name an entity.
    const feature = this.reflector.get<string>('feature', context.getHandler());
    if (feature) {
      assertFeature(request, feature);
    }

    // Get permission metadata from decorator
    const permissionMetadata = this.reflector.get<{ entity: string; operation: string }>(
      'permission',
      context.getHandler(),
    );

    // If no permission metadata is set, allow access (optional permission check)
    if (!permissionMetadata) {
      return true;
    }

    const { entity: requiredEntity, operation: requiredOperation } = permissionMetadata;

    // Get user permissions from request (set by AuthGuard)
    const userPermissions = request.userPermissions || {};
    const userRoleId = request.userRoleId;

    // Normalize entity name to lowercase (database convention)
    const normalizedEntity = requiredEntity.toLowerCase();

    // Special handling for RolesAndPermissions - allow read/list even without role
    // This allows users to see available roles so they can be assigned one
    if (normalizedEntity === 'rolesandpermissions') {
      if (requiredOperation === 'read' || requiredOperation === 'list') {
        // Allow read/list of roles even without a role assigned
        if (!userRoleId) {
          return true; // Allow access to view roles
        }
      }
      // For create/update/delete on RolesAndPermissions, require role
      if (!userRoleId) {
        throw new ForbiddenException('User does not have a role assigned. Only read/list operations are allowed for RolesAndPermissions without a role.');
      }
    } else {
      // For all other entities, require a role to access
      if (!userRoleId) {
        throw new ForbiddenException('User does not have a role assigned. Please contact an administrator to assign a role.');
      }
    }

    // Get permissions for this entity
    const entityPermissions = userPermissions[normalizedEntity] || {};

    // Map frontend operation names to database operation names
    const operationMap: Record<string, string> = {
      'read': 'get',
      'list': 'getAll',
      'create': 'create',
      'update': 'update',
      'delete': 'delete',
    };

    /**
     * PG-07 — action permissions.
     *
     * CRUD is not enough to express authority. "Activate this workflow" and
     * "roll it back" both used to require plain update permission, so granting
     * someone permission to edit a draft also let them put it live.
     * An operation of the form action:<name> is checked against a separate
     * actions map on the entity, so those can be granted independently.
     *
     * The SAME list drives the buttons in the UI, so an affordance can never
     * appear for something the API will refuse — which is the drift that let
     * G17 ship an endpoint with no guard at all.
     */
    if (requiredOperation.startsWith('action:')) {
      const actionName = requiredOperation.slice('action:'.length);
      const actions = (entityPermissions as any).actions || {};
      const allowed = actions[actionName] === true;
      if (!allowed) {
        throw new ForbiddenException(
          `Access denied: you do not have permission to perform the '${actionName}' action on '${requiredEntity}'`
        );
      }
      return true;
    }

    // Normalize operation name
    const normalizedOperation = operationMap[requiredOperation] || requiredOperation.toLowerCase();

    // Check if user has the required permission
    // Support both camelCase and lowercase keys
    const hasPermission = 
      entityPermissions[normalizedOperation] === true ||
      entityPermissions[normalizedOperation.charAt(0).toUpperCase() + normalizedOperation.slice(1)] === true ||
      entityPermissions[requiredOperation] === true ||
      entityPermissions[requiredOperation.charAt(0).toUpperCase() + requiredOperation.slice(1)] === true;

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied: You do not have permission to perform '${requiredOperation}' on '${requiredEntity}'`
      );
    }

    return true;
  }
}
