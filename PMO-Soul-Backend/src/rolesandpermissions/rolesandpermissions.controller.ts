
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { RolesAndPermissionsService } from './rolesandpermissions.service';
import { CreateRolesAndPermissionsDto } from './dto/create-rolesandpermissions.dto';
import { UpdateRolesAndPermissionsDto } from './dto/update-rolesandpermissions.dto';
import { AuthGuard } from '../guards/auth.guard';
import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('RolesAndPermissions')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('rolesandpermissions')
export class RolesAndPermissionsController {
  constructor(private readonly rolesAndPermissionsService: RolesAndPermissionsService) {}

  @ApiOperation({
    summary: 'Get all roles and permissions',
    description: 'Retrieves all roles and permissions in the system with pagination, filtering, and sorting.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
  @RequirePermission('RolesAndPermissions', 'list')
  @Get()
  async getAllRolesAndPermissions(
    @Query() query: any,
    @Request() req?
  ) {
    const userId = req?.userId;
    
    // Extract pagination and search params
    const page = query.page !== undefined ? Number(query.page) : 0;
    const limit = query.limit !== undefined ? Number(query.limit) : 10;
    const sortBy = query.sortBy;
    const sortOrder = query.sortOrder;
    const q = query.q;
    
    // Extract filters (any query param that's not pagination/search/sort)
    const reservedKeys = ['page', 'limit', 'sortBy', 'sortOrder', 'q'];
    const filters: any = {};
    for (const [key, value] of Object.entries(query)) {
      if (!reservedKeys.includes(key)) {
        filters[key] = value;
      }
    }
    
    // Validate and cast sortOrder to 'asc' | 'desc' | undefined
    const validSortOrder: 'asc' | 'desc' | undefined = 
      sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined;
    
    const result: any = await this.rolesAndPermissionsService.getAllRolesAndPermissions({
      page,
      limit,
      sortBy,
      sortOrder: validSortOrder,
      q,
      filters,
    });
    
    // Format response for React Admin
    return {
      data: Array.isArray(result) ? result : (result?.data || []),
      total: Array.isArray(result) ? result.length : (result?.total || 0),
    };
  }

  @ApiOperation({ summary: 'Get a role and permissions by id' })
  @ApiParam({ name: 'id', type: Number, description: 'RolesAndPermissions ID' })
  @RequirePermission('RolesAndPermissions', 'read')
  @Get(':id')
  async getRolesAndPermissionsById(@Param('id', ParseIntPipe) id: number) {
    return await this.rolesAndPermissionsService.getRolesAndPermissionsById(id);
  }

  @ApiOperation({ summary: 'Create a new role and permissions' })
  @RequirePermission('RolesAndPermissions', 'create')
  @Post()
  async createRolesAndPermissions(@Body() createDto: CreateRolesAndPermissionsDto, @Request() req) {
    const userId = req.userId;
    const applicationId = process.env.PROJECT_ID;
    return await this.rolesAndPermissionsService.createRolesAndPermissions(createDto, userId, applicationId);
  }

  @ApiOperation({ summary: 'Update a role and permissions' })
  @ApiParam({ name: 'id', type: Number, description: 'RolesAndPermissions ID' })
  @RequirePermission('RolesAndPermissions', 'update')
  @Patch(':id')
  async updateRolesAndPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateRolesAndPermissionsDto,
    @Request() req
  ) {
    const userId = req.userId;
    const applicationId = process.env.PROJECT_ID;
    console.log('Controller - Received update request for rolesandpermissions id:', id);
    console.log('Controller - Update DTO:', JSON.stringify(updateDto, null, 2));
    
    const result = await this.rolesAndPermissionsService.updateRolesAndPermissions(id, updateDto, userId, applicationId);
    
    console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
    
    // Log entityPermissions with sorted keys for easier comparison (JSON keys are unordered)
    const resultPerms = (result as any)?.entityPermissions;
    if (resultPerms) {
      const sortedKeys = Object.keys(resultPerms).sort();
      console.log('Controller - Result entityPermissions (sorted keys):', JSON.stringify(resultPerms, sortedKeys, 2));
    }
    
    return result;
  }

  @ApiOperation({ summary: 'Delete a role and permissions' })
  @ApiParam({ name: 'id', type: Number, description: 'RolesAndPermissions ID' })
  @RequirePermission('RolesAndPermissions', 'delete')
  @Delete(':id')
  async deleteRolesAndPermissions(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const applicationId = process.env.PROJECT_ID;
    return await this.rolesAndPermissionsService.deleteRolesAndPermissions(id, applicationId);
  }
}
