
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRolesAndPermissionsDto } from './dto/create-rolesandpermissions.dto';
import { UpdateRolesAndPermissionsDto } from './dto/update-rolesandpermissions.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { buildUpdateEventPayload } from '../shared/entity-event-payload';

// Page size bounds (scalability-plan §1.3). Same values as the entity logic in shared/, kept
// here rather than imported because this service has no dependency on shared/ today and one
// pair of numbers is not worth a new module boundary.
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class RolesAndPermissionsService {
  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {}

  /**
   * Hand a role change to the workflow engine, exactly as every other table's logic does
   * (shared/*-logic.ts → hooks.internal.onEntityEvent). This service writes roles itself rather
   * than through that logic, and it used to skip this call — so no workflow on Roles & Permissions
   * could ever be triggered by creating, renaming or deleting a role. Fire-and-forget: a failing
   * workflow must never fail the write.
   */
  private fireWorkflows(event: 'onCreate' | 'onUpdate' | 'onDelete', data: any) {
    this.workflowRunner.onEntityEvent('RolesAndPermissions', event, data).catch((err) =>
      console.error('Workflow trigger failed:', err),
    );
  }

  async getAllRolesAndPermissions(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    q?: string;
    filters?: any;
  }) {
    const {
      page: rawPage,
      limit: rawLimit,
      sortBy,
      sortOrder = 'asc',
      q,
      filters = {},
    } = params || {};

    // Clamped, not trusted — see scalability-plan §1.3. Anything non-numeric, zero or negative
    // falls back to the default rather than being handed to Prisma as `take`/`skip`.
    const requestedLimit = Math.trunc(Number(rawLimit));
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

    const requestedPage = Math.trunc(Number(rawPage));
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 0;

    // Build where clause for search and filters
    const where: Prisma.RolesAndPermissionsWhereInput = {};
    
    if (q && q.trim()) {
      const searchTerm = q.trim();
      // Search in role field
      where.OR = [
        {
          role: {
            contains: searchTerm,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        },
      ];
    }

    // Handle field-specific filters
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      
      // Handle operators in filter keys (e.g., "id_gt", "role_contains")
      const parts = key.split('_');
      const field = parts[0];
      const operator = parts[1] || 'equals';
      
      // Determine field type
      const numberFields = ['id'];
      const dateFields = ['createdAt', 'updatedAt'];
      const isNumber = numberFields.includes(field);
      const isDate = dateFields.includes(field);
      
      let filterValue: any = value;
      if (isNumber && typeof value === 'string') {
        filterValue = parseInt(value, 10);
      } else if (isDate && typeof value === 'string') {
        filterValue = new Date(value);
      }
      
      // Build filter based on operator
      if (operator === 'equals') {
        where[field] = filterValue;
      } else if (operator === 'contains' && !isNumber && !isDate) {
        where[field] = { contains: filterValue, mode: 'insensitive' as Prisma.QueryMode };
      } else if (operator === 'startsWith' && !isNumber && !isDate) {
        where[field] = { startsWith: filterValue, mode: 'insensitive' as Prisma.QueryMode };
      } else if (operator === 'endsWith' && !isNumber && !isDate) {
        where[field] = { endsWith: filterValue, mode: 'insensitive' as Prisma.QueryMode };
      } else if (operator === 'gt') {
        where[field] = { gt: filterValue };
      } else if (operator === 'gte') {
        where[field] = { gte: filterValue };
      } else if (operator === 'lt') {
        where[field] = { lt: filterValue };
      } else if (operator === 'lte') {
        where[field] = { lte: filterValue };
      } else if (operator === 'ne') {
        where[field] = { not: filterValue };
      }
    }

    // Build orderBy clause
    const orderBy: Prisma.RolesAndPermissionsOrderByWithRelationInput = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.id = 'asc'; // Default sort by id
    }

    // Get total count for pagination
    const total = await this.prisma.rolesAndPermissions.count({ where });

    // Get paginated results
    const data = await this.prisma.rolesAndPermissions.findMany({
      where,
      orderBy,
      skip: page * limit,
      take: limit,
    });

    return {
      data,
      total,
      // The page size actually used, so a caller that asked for more than the cap can tell.
      page,
      limit,
    };
  }

  async getRolesAndPermissionsById(id: number) {
    return this.prisma.rolesAndPermissions.findUnique({
      where: { id }
    });
  }

  async createRolesAndPermissions(dto: CreateRolesAndPermissionsDto, userId: number, applicationId?: string) {
    // Handle JSON fields explicitly - Prisma expects objects/arrays, not strings
    const createData: any = { ...dto };
    
    if (createData.entityPermissions !== undefined) {
      // Ensure JSON fields are objects/arrays, not strings
      if (typeof createData.entityPermissions === 'string') {
        try {
          createData.entityPermissions = JSON.parse(createData.entityPermissions);
        } catch (e) {
          console.error('Error parsing entityPermissions JSON:', e);
          throw new Error(`Invalid JSON format for entityPermissions: ${e.message}`);
        }
      }
    }
    
    const result = await this.prisma.rolesAndPermissions.create({
      data: createData,
    });
    this.fireWorkflows('onCreate', result);

    return result;
  }

  async updateRolesAndPermissions(id: number, dto: UpdateRolesAndPermissionsDto, userId: number, applicationId?: string) {
    try {
      // Prepare data for Prisma update
      const updateData: any = { ...dto };
      
      // Handle JSON fields explicitly - Prisma expects objects/arrays, not strings
      if (updateData.entityPermissions !== undefined) {
        console.log('Service - Updating entityPermissions field:', JSON.stringify(updateData.entityPermissions, null, 2));
        // Ensure JSON fields are objects/arrays, not strings
        if (typeof updateData.entityPermissions === 'string') {
          try {
            updateData.entityPermissions = JSON.parse(updateData.entityPermissions);
          } catch (e) {
            console.error('Error parsing entityPermissions JSON:', e);
            throw new Error(`Invalid JSON format for entityPermissions: ${e.message}`);
          }
        }
        // Prisma JSON fields accept Prisma.JsonValue (object, array, string, number, boolean, null)
        // Ensure it's a valid JSON-serializable value
        if (updateData.entityPermissions !== null && typeof updateData.entityPermissions !== 'object' && typeof updateData.entityPermissions !== 'string' && typeof updateData.entityPermissions !== 'number' && typeof updateData.entityPermissions !== 'boolean') {
          console.warn('Warning: entityPermissions is not a valid JSON value, converting to object');
          updateData.entityPermissions = updateData.entityPermissions as any;
        }
      }
      
      console.log('Service - Updating rolesandpermissions id:', id);
      console.log('Service - Update data keys:', Object.keys(updateData));
      console.log('Service - Update data:', JSON.stringify(updateData, null, 2));
      
      // The values before the change: On Record Updated reads {{previous.*}} and {{changedFields}}.
      const previous = await this.prisma.rolesAndPermissions.findUnique({ where: { id } });

      // Perform the update
      console.log('Service - About to call Prisma update...');
      const result = await this.prisma.rolesAndPermissions.update({
        where: { id },
        data: updateData,
      });
      
      console.log('Service - Prisma update completed');
      console.log('Service - Update successful, result id:', result.id);
      console.log('Service - Update successful, result updatedAt:', result.updatedAt);
      console.log('Service - Update successful, result entityPermissions:', JSON.stringify(result.entityPermissions, null, 2));
      
      // Wait a moment to ensure database commit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the update was actually saved by fetching it again immediately
      console.log('Service - Verifying update by fetching from database...');
      const verifyResult = await this.prisma.rolesAndPermissions.findUnique({
        where: { id },
      });
      
      if (!verifyResult) {
        console.error('Service - ❌ ERROR: Record not found after update!');
        throw new Error('Record not found after update');
      }
      
      console.log('Service - Verification fetch - id:', verifyResult.id);
      console.log('Service - Verification fetch - updatedAt:', verifyResult.updatedAt);
      console.log('Service - Verification fetch - entityPermissions:', JSON.stringify(verifyResult.entityPermissions, null, 2));
      
      // Compare the saved data with what we sent (deep comparison, ignoring key order)
      const savedPerms = verifyResult.entityPermissions;
      const sentPerms = updateData.entityPermissions;
      
      // Deep comparison function that ignores key order
      // ✅ GOOD - Deep comparison that ignores key order (JSON keys are unordered in PostgreSQL)
      const deepEqual = (obj1: any, obj2: any): boolean => {
        if (obj1 === obj2) return true;
        if (obj1 == null || obj2 == null) return false;
        if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
        
        const keys1 = Object.keys(obj1).sort();
        const keys2 = Object.keys(obj2).sort();
        
        if (keys1.length !== keys2.length) return false;
        // Verify sorted keys match (ensures same keys, just potentially different order)
        if (JSON.stringify(keys1) !== JSON.stringify(keys2)) return false;
        
        // Compare values for each key
        return keys1.every(key => deepEqual(obj1[key], obj2[key]));
      };
      
      const permissionsMatch = deepEqual(sentPerms, savedPerms);
      
      console.log('Service - Comparing sent vs saved permissions (ignoring key order)...');
      // Safely get keys for logging (handle null/undefined)
      const sentKeys = sentPerms && typeof sentPerms === 'object' ? Object.keys(sentPerms).sort() : [];
      const savedKeys = savedPerms && typeof savedPerms === 'object' ? Object.keys(savedPerms).sort() : [];
      console.log('Service - Sent:', JSON.stringify(sentPerms, sentKeys, 2));
      console.log('Service - Saved:', JSON.stringify(savedPerms, savedKeys, 2));
      
      if (!permissionsMatch) {
        console.error('Service - ❌ MISMATCH! Sent permissions do not match saved permissions!');
        // Still return the result, but log the mismatch
      } else {
        console.log('Service - ✅ Permissions match! Update was successful (key order may differ, but values are correct).');
      }
      
      this.fireWorkflows('onUpdate', buildUpdateEventPayload(previous as any, result as any));

      return result;
    } catch (error) {
      console.error('Service - Update error:', error);
      console.error('Service - Error stack:', error.stack);
      throw error;
    }
  }

  async deleteRolesAndPermissions(id: number, applicationId?: string) {
    // Get the record before deletion for event data
    const deletedRecord = await this.prisma.rolesAndPermissions.findUnique({
      where: { id }
    });

    const result = await this.prisma.rolesAndPermissions.delete({
      where: { id }
    });
    this.fireWorkflows('onDelete', deletedRecord ?? result);

    return result;
  }
}
