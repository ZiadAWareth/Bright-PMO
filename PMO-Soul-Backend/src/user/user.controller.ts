
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { UserService } from './user.service';
  import { CreateUserDto } from './dto/create-user.dto';
  import { UpdateUserDto } from './dto/update-user.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('User')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('user')
  export class UserController {
  constructor(private readonly userService: UserService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'User', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all users',
    description: 'Retrieves all users in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('User', 'list')
    @Get()
    async getAllUsers(
      @Query() query: any,
      @Request() req?
    ){
        const userId = req?.userId;     // Get userId from guard
        
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
        
        const result: any = await this.userService.getAllUsers({
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

    @ApiOperation({
      summary: 'Aggregate users',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on User (required for everything but count; numeric for ' +
        'sum and avg, numeric or date for min and max), and where is a list of ' +
        '{ field, op, value } using the same operators as the list endpoint: ' +
        FILTER_OPERATORS.join(', ') +
        '. Answers { value, valueType, fn, field, entity }; value is null when no rows matched.',
    })
    @ApiBody({
      schema: {
        type: 'object',
        required: ['fn'],
        properties: {
          fn: { type: 'string', enum: [...AGGREGATE_FUNCTIONS] },
          field: { type: 'string' },
          where: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'value'],
              properties: {
                field: { type: 'string' },
                op: { type: 'string', enum: [...FILTER_OPERATORS] },
                value: {},
              },
            },
          },
        },
      },
    })
    // The SAME permission the list endpoint requires. A person who cannot see users
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('User', 'list')
    @Post('aggregate')
    async aggregateUsers(@Body() body: AggregateRequest){
        try {
          return await this.userService.aggregateUser(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a user by id'})
    @ApiParam({ name: 'id', type: Number, description: 'User ID' })
    @RequirePermission('User', 'read')
    @Get(':id')
    async getUserById(@Param('id', ParseIntPipe) id:number){
        return await this.userService.getUserById(id);
    }

    @ApiOperation({summary:'Create a new user'})
    @RequirePermission('User', 'create')
    @Post()
    async createUser(@Body() createUserDto: CreateUserDto, @Request() req){
        await this.refuseWorkflowFields(createUserDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.userService.createUser(createUserDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a user'})
    @ApiParam({ name: 'id', type: Number, description: 'User ID' })
    @RequirePermission('User', 'update')
    @Patch(':id')
    async updateUser(@Param('id', ParseIntPipe) id:number, @Body() updateUserDto: UpdateUserDto, @Request() req){
        await this.refuseWorkflowFields(updateUserDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for user id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateUserDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateUserDto));
            
            const result = await this.userService.updateUser(id, updateUserDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a user'})
    @ApiParam({ name: 'id', type: Number, description: 'User ID' })
    @RequirePermission('User', 'delete')
    @Delete(':id')
    async deleteUser(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.userService.deleteUser(id, applicationId);
    }
    
  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get UserProfile (userprofile) for User' })
  @Get(':id/userprofile')
  getUserProfile(@Param('id') id: number) {
    return this.userService.getUserProfile(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get RefreshToken list (refreshtokens) for User' })
  @Get(':id/refreshtokens')
  getRefreshTokens(@Param('id') id: number) {
    return this.userService.getRefreshTokens(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Portfolio list (portfolios) for User' })
  @Get(':id/portfolios')
  getPortfolios(@Param('id') id: number) {
    return this.userService.getPortfolios(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Project list (projects) for User' })
  @Get(':id/projects')
  getProjects(@Param('id') id: number) {
    return this.userService.getProjects(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Project list (projectsCreatedBy) for User' })
  @Get(':id/projectscreatedby')
  getProjectsCreatedBy(@Param('id') id: number) {
    return this.userService.getProjectsCreatedBy(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get ProjectMember list (projectmembers) for User' })
  @Get(':id/projectmembers')
  getProjectMembers(@Param('id') id: number) {
    return this.userService.getProjectMembers(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get ProjectLifecycleStep list (projectlifecyclesteps) for User' })
  @Get(':id/projectlifecyclesteps')
  getProjectLifecycleSteps(@Param('id') id: number) {
    return this.userService.getProjectLifecycleSteps(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get WorkItem list (workitems) for User' })
  @Get(':id/workitems')
  getWorkItems(@Param('id') id: number) {
    return this.userService.getWorkItems(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get WorkItem list (workitemsCreatedBy) for User' })
  @Get(':id/workitemscreatedby')
  getWorkitemsCreatedBy(@Param('id') id: number) {
    return this.userService.getWorkitemsCreatedBy(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get WorkItemAssignee list (workitemassignees) for User' })
  @Get(':id/workitemassignees')
  getWorkItemAssignees(@Param('id') id: number) {
    return this.userService.getWorkItemAssignees(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get StatusTransition list (statustransitions) for User' })
  @Get(':id/statustransitions')
  getStatusTransitions(@Param('id') id: number) {
    return this.userService.getStatusTransitions(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Comment list (comments) for User' })
  @Get(':id/comments')
  getComments(@Param('id') id: number) {
    return this.userService.getComments(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get CommentMention list (commentmentions) for User' })
  @Get(':id/commentmentions')
  getCommentMentions(@Param('id') id: number) {
    return this.userService.getCommentMentions(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Baseline list (baselines) for User' })
  @Get(':id/baselines')
  getBaselines(@Param('id') id: number) {
    return this.userService.getBaselines(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get SprintCapacity list (sprintcapacitys) for User' })
  @Get(':id/sprintcapacitys')
  getSprintCapacitys(@Param('id') id: number) {
    return this.userService.getSprintCapacitys(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Resource (resource) for User' })
  @Get(':id/resource')
  getResource(@Param('id') id: number) {
    return this.userService.getResource(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get ProgressReport list (progressreports) for User' })
  @Get(':id/progressreports')
  getProgressReports(@Param('id') id: number) {
    return this.userService.getProgressReports(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Site list (sites) for User' })
  @Get(':id/sites')
  getSites(@Param('id') id: number) {
    return this.userService.getSites(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get EquipmentSiteLog list (equipmentsitelogs) for User' })
  @Get(':id/equipmentsitelogs')
  getEquipmentSiteLogs(@Param('id') id: number) {
    return this.userService.getEquipmentSiteLogs(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get MaintenanceLog list (maintenancelogs) for User' })
  @Get(':id/maintenancelogs')
  getMaintenanceLogs(@Param('id') id: number) {
    return this.userService.getMaintenanceLogs(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Risk list (risks) for User' })
  @Get(':id/risks')
  getRisks(@Param('id') id: number) {
    return this.userService.getRisks(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get RiskMitigation list (riskmitigations) for User' })
  @Get(':id/riskmitigations')
  getRiskMitigations(@Param('id') id: number) {
    return this.userService.getRiskMitigations(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get RiskMitigation list (riskmitigationsAssignee) for User' })
  @Get(':id/riskmitigationsassignee')
  getRiskmitigationsAssignee(@Param('id') id: number) {
    return this.userService.getRiskmitigationsAssignee(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Document list (documents) for User' })
  @Get(':id/documents')
  getDocuments(@Param('id') id: number) {
    return this.userService.getDocuments(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Timesheet list (timesheets) for User' })
  @Get(':id/timesheets')
  getTimesheets(@Param('id') id: number) {
    return this.userService.getTimesheets(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Timesheet list (timesheetsApprovedBy) for User' })
  @Get(':id/timesheetsapprovedby')
  getTimesheetsApprovedBy(@Param('id') id: number) {
    return this.userService.getTimesheetsApprovedBy(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get TimeEntry list (timeentrys) for User' })
  @Get(':id/timeentrys')
  getTimeEntrys(@Param('id') id: number) {
    return this.userService.getTimeEntrys(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get ApprovalRequest list (approvalrequests) for User' })
  @Get(':id/approvalrequests')
  getApprovalRequests(@Param('id') id: number) {
    return this.userService.getApprovalRequests(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get ApprovalStep list (approvalsteps) for User' })
  @Get(':id/approvalsteps')
  getApprovalSteps(@Param('id') id: number) {
    return this.userService.getApprovalSteps(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get ApprovalStep list (approvalstepsDecidedBy) for User' })
  @Get(':id/approvalstepsdecidedby')
  getApprovalstepsDecidedBy(@Param('id') id: number) {
    return this.userService.getApprovalstepsDecidedBy(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get ClosureItem list (closureitems) for User' })
  @Get(':id/closureitems')
  getClosureItems(@Param('id') id: number) {
    return this.userService.getClosureItems(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get ChecklistItem list (checklistitems) for User' })
  @Get(':id/checklistitems')
  getChecklistItems(@Param('id') id: number) {
    return this.userService.getChecklistItems(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get PunchListItem list (punchlistitems) for User' })
  @Get(':id/punchlistitems')
  getPunchListItems(@Param('id') id: number) {
    return this.userService.getPunchListItems(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Inspection list (inspections) for User' })
  @Get(':id/inspections')
  getInspections(@Param('id') id: number) {
    return this.userService.getInspections(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Handover list (handovers) for User' })
  @Get(':id/handovers')
  getHandovers(@Param('id') id: number) {
    return this.userService.getHandovers(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get ActivityLog list (activitylogs) for User' })
  @Get(':id/activitylogs')
  getActivityLogs(@Param('id') id: number) {
    return this.userService.getActivityLogs(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Lesson list (lessons) for User' })
  @Get(':id/lessons')
  getLessons(@Param('id') id: number) {
    return this.userService.getLessons(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get RolesAndPermissions (rolesandpermissions) for User' })
  @Get(':id/rolesandpermissions')
  getRolesAndPermissions(@Param('id') id: number) {
    return this.userService.getRolesAndPermissions(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get BusinessUnit (businessunit) for User' })
  @Get(':id/businessunit')
  getBusinessUnit(@Param('id') id: number) {
    return this.userService.getBusinessUnit(id);
  }

  @RequirePermission('User', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for User' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.userService.getOrganization(id);
  }

  }
