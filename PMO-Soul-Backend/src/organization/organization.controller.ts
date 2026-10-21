
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { OrganizationService } from './organization.service';
  import { CreateOrganizationDto } from './dto/create-organization.dto';
  import { UpdateOrganizationDto } from './dto/update-organization.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('Organization')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('organization')
  export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'Organization', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all organizations',
    description: 'Retrieves all organizations in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('Organization', 'list')
    @Get()
    async getAllOrganizations(
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
        
        const result: any = await this.organizationService.getAllOrganizations({
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
      summary: 'Aggregate organizations',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on Organization (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see organizations
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('Organization', 'list')
    @Post('aggregate')
    async aggregateOrganizations(@Body() body: AggregateRequest){
        try {
          return await this.organizationService.aggregateOrganization(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a organization by id'})
    @ApiParam({ name: 'id', type: Number, description: 'Organization ID' })
    @RequirePermission('Organization', 'read')
    @Get(':id')
    async getOrganizationById(@Param('id', ParseIntPipe) id:number){
        return await this.organizationService.getOrganizationById(id);
    }

    @ApiOperation({summary:'Create a new organization'})
    @RequirePermission('Organization', 'create')
    @Post()
    async createOrganization(@Body() createOrganizationDto: CreateOrganizationDto, @Request() req){
        await this.refuseWorkflowFields(createOrganizationDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.organizationService.createOrganization(createOrganizationDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a organization'})
    @ApiParam({ name: 'id', type: Number, description: 'Organization ID' })
    @RequirePermission('Organization', 'update')
    @Patch(':id')
    async updateOrganization(@Param('id', ParseIntPipe) id:number, @Body() updateOrganizationDto: UpdateOrganizationDto, @Request() req){
        await this.refuseWorkflowFields(updateOrganizationDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for organization id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateOrganizationDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateOrganizationDto));
            
            const result = await this.organizationService.updateOrganization(id, updateOrganizationDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a organization'})
    @ApiParam({ name: 'id', type: Number, description: 'Organization ID' })
    @RequirePermission('Organization', 'delete')
    @Delete(':id')
    async deleteOrganization(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.organizationService.deleteOrganization(id, applicationId);
    }
    
  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get OrganizationSettings (organizationsettings) for Organization' })
  @Get(':id/organizationsettings')
  getOrganizationSettings(@Param('id') id: number) {
    return this.organizationService.getOrganizationSettings(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ApiKey list (apikeys) for Organization' })
  @Get(':id/apikeys')
  getApiKeys(@Param('id') id: number) {
    return this.organizationService.getApiKeys(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get IntegrationConnection list (integrationconnections) for Organization' })
  @Get(':id/integrationconnections')
  getIntegrationConnections(@Param('id') id: number) {
    return this.organizationService.getIntegrationConnections(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Eps list (epss) for Organization' })
  @Get(':id/epss')
  getEpss(@Param('id') id: number) {
    return this.organizationService.getEpss(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Portfolio list (portfolios) for Organization' })
  @Get(':id/portfolios')
  getPortfolios(@Param('id') id: number) {
    return this.organizationService.getPortfolios(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ProjectCategory list (projectcategorys) for Organization' })
  @Get(':id/projectcategorys')
  getProjectCategorys(@Param('id') id: number) {
    return this.organizationService.getProjectCategorys(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkCalendar list (workcalendars) for Organization' })
  @Get(':id/workcalendars')
  getWorkCalendars(@Param('id') id: number) {
    return this.organizationService.getWorkCalendars(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Project list (projects) for Organization' })
  @Get(':id/projects')
  getProjects(@Param('id') id: number) {
    return this.organizationService.getProjects(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get LifecycleTemplate list (lifecycletemplates) for Organization' })
  @Get(':id/lifecycletemplates')
  getLifecycleTemplates(@Param('id') id: number) {
    return this.organizationService.getLifecycleTemplates(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Resource list (resources) for Organization' })
  @Get(':id/resources')
  getResources(@Param('id') id: number) {
    return this.organizationService.getResources(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Vendor list (vendors) for Organization' })
  @Get(':id/vendors')
  getVendors(@Param('id') id: number) {
    return this.organizationService.getVendors(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Document list (documents) for Organization' })
  @Get(':id/documents')
  getDocuments(@Param('id') id: number) {
    return this.organizationService.getDocuments(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ApprovalPolicy list (approvalpolicys) for Organization' })
  @Get(':id/approvalpolicys')
  getApprovalPolicys(@Param('id') id: number) {
    return this.organizationService.getApprovalPolicys(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ClosureTemplate list (closuretemplates) for Organization' })
  @Get(':id/closuretemplates')
  getClosureTemplates(@Param('id') id: number) {
    return this.organizationService.getClosureTemplates(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ActivityLog list (activitylogs) for Organization' })
  @Get(':id/activitylogs')
  getActivityLogs(@Param('id') id: number) {
    return this.organizationService.getActivityLogs(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get BusinessUnit list (businessunits) for Organization' })
  @Get(':id/businessunits')
  getBusinessUnits(@Param('id') id: number) {
    return this.organizationService.getBusinessUnits(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Notification list (notifications) for Organization' })
  @Get(':id/notifications')
  getNotifications(@Param('id') id: number) {
    return this.organizationService.getNotifications(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get SprintSnapshot list (sprintSnapshots) for Organization' })
  @Get(':id/sprintsnapshots')
  getSprintSnapshots(@Param('id') id: number) {
    return this.organizationService.getSprintSnapshots(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Lesson list (lessons) for Organization' })
  @Get(':id/lessons')
  getLessons(@Param('id') id: number) {
    return this.organizationService.getLessons(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get CommentMention list (commentMentions) for Organization' })
  @Get(':id/commentmentions')
  getCommentMentions(@Param('id') id: number) {
    return this.organizationService.getCommentMentions(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get MaintenanceSchedule list (maintenanceSchedules) for Organization' })
  @Get(':id/maintenanceschedules')
  getMaintenanceSchedules(@Param('id') id: number) {
    return this.organizationService.getMaintenanceSchedules(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ResourceAssignment list (resourceAssignments) for Organization' })
  @Get(':id/resourceassignments')
  getResourceAssignments(@Param('id') id: number) {
    return this.organizationService.getResourceAssignments(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Inspection list (inspections) for Organization' })
  @Get(':id/inspections')
  getInspections(@Param('id') id: number) {
    return this.organizationService.getInspections(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkItemLink list (workItemLinks) for Organization' })
  @Get(':id/workitemlinks')
  getWorkItemLinks(@Param('id') id: number) {
    return this.organizationService.getWorkItemLinks(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get CalendarException list (calendarExceptions) for Organization' })
  @Get(':id/calendarexceptions')
  getCalendarExceptions(@Param('id') id: number) {
    return this.organizationService.getCalendarExceptions(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Alert list (alerts) for Organization' })
  @Get(':id/alerts')
  getAlerts(@Param('id') id: number) {
    return this.organizationService.getAlerts(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get EvmSnapshot list (evmSnapshots) for Organization' })
  @Get(':id/evmsnapshots')
  getEvmSnapshots(@Param('id') id: number) {
    return this.organizationService.getEvmSnapshots(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkItem list (workItems) for Organization' })
  @Get(':id/workitems')
  getWorkItems(@Param('id') id: number) {
    return this.organizationService.getWorkItems(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ProjectMember list (projectMembers) for Organization' })
  @Get(':id/projectmembers')
  getProjectMembers(@Param('id') id: number) {
    return this.organizationService.getProjectMembers(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ProjectClosure list (projectClosures) for Organization' })
  @Get(':id/projectclosures')
  getProjectClosures(@Param('id') id: number) {
    return this.organizationService.getProjectClosures(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ChecklistItem list (checklistItems) for Organization' })
  @Get(':id/checklistitems')
  getChecklistItems(@Param('id') id: number) {
    return this.organizationService.getChecklistItems(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ApprovalPolicyStep list (approvalPolicySteps) for Organization' })
  @Get(':id/approvalpolicysteps')
  getApprovalPolicySteps(@Param('id') id: number) {
    return this.organizationService.getApprovalPolicySteps(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get CostTransaction list (costTransactions) for Organization' })
  @Get(':id/costtransactions')
  getCostTransactions(@Param('id') id: number) {
    return this.organizationService.getCostTransactions(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Contract list (contracts) for Organization' })
  @Get(':id/contracts')
  getContracts(@Param('id') id: number) {
    return this.organizationService.getContracts(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Workflow list (workflows) for Organization' })
  @Get(':id/workflows')
  getWorkflows(@Param('id') id: number) {
    return this.organizationService.getWorkflows(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get IdpInboxEvent list (idpInboxEvents) for Organization' })
  @Get(':id/idpinboxevents')
  getIdpInboxEvents(@Param('id') id: number) {
    return this.organizationService.getIdpInboxEvents(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkItemStatus list (workItemStatuses) for Organization' })
  @Get(':id/workitemstatuss')
  getWorkItemStatuss(@Param('id') id: number) {
    return this.organizationService.getWorkItemStatuss(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ProjectLifecycleStep list (projectLifecycleSteps) for Organization' })
  @Get(':id/projectlifecyclesteps')
  getProjectLifecycleSteps(@Param('id') id: number) {
    return this.organizationService.getProjectLifecycleSteps(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ProgressReport list (progressReports) for Organization' })
  @Get(':id/progressreports')
  getProgressReports(@Param('id') id: number) {
    return this.organizationService.getProgressReports(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get TimeEntry list (timeEntries) for Organization' })
  @Get(':id/timeentrys')
  getTimeEntrys(@Param('id') id: number) {
    return this.organizationService.getTimeEntrys(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get LifecycleTemplateStep list (lifecycleTemplateSteps) for Organization' })
  @Get(':id/lifecycletemplatesteps')
  getLifecycleTemplateSteps(@Param('id') id: number) {
    return this.organizationService.getLifecycleTemplateSteps(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get RfqResponse list (rfqResponses) for Organization' })
  @Get(':id/rfqresponses')
  getRfqResponses(@Param('id') id: number) {
    return this.organizationService.getRfqResponses(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Timesheet list (timesheets) for Organization' })
  @Get(':id/timesheets')
  getTimesheets(@Param('id') id: number) {
    return this.organizationService.getTimesheets(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get EquipmentSiteLog list (equipmentSiteLogs) for Organization' })
  @Get(':id/equipmentsitelogs')
  getEquipmentSiteLogs(@Param('id') id: number) {
    return this.organizationService.getEquipmentSiteLogs(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Site list (sites) for Organization' })
  @Get(':id/sites')
  getSites(@Param('id') id: number) {
    return this.organizationService.getSites(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Checklist list (checklists) for Organization' })
  @Get(':id/checklists')
  getChecklists(@Param('id') id: number) {
    return this.organizationService.getChecklists(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Handover list (handovers) for Organization' })
  @Get(':id/handovers')
  getHandovers(@Param('id') id: number) {
    return this.organizationService.getHandovers(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ClosureTemplateItem list (closureTemplateItems) for Organization' })
  @Get(':id/closuretemplateitems')
  getClosureTemplateItems(@Param('id') id: number) {
    return this.organizationService.getClosureTemplateItems(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get SprintCapacity list (sprintCapacities) for Organization' })
  @Get(':id/sprintcapacitys')
  getSprintCapacitys(@Param('id') id: number) {
    return this.organizationService.getSprintCapacitys(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Risk list (risks) for Organization' })
  @Get(':id/risks')
  getRisks(@Param('id') id: number) {
    return this.organizationService.getRisks(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Comment list (comments) for Organization' })
  @Get(':id/comments')
  getComments(@Param('id') id: number) {
    return this.organizationService.getComments(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WbsNode list (wbsNodes) for Organization' })
  @Get(':id/wbsnodes')
  getWbsNodes(@Param('id') id: number) {
    return this.organizationService.getWbsNodes(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get RecurringWorkItem list (recurringWorkItems) for Organization' })
  @Get(':id/recurringworkitems')
  getRecurringWorkItems(@Param('id') id: number) {
    return this.organizationService.getRecurringWorkItems(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Release list (releases) for Organization' })
  @Get(':id/releases')
  getReleases(@Param('id') id: number) {
    return this.organizationService.getReleases(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get SavedReport list (savedReports) for Organization' })
  @Get(':id/savedreports')
  getSavedReports(@Param('id') id: number) {
    return this.organizationService.getSavedReports(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get RefreshToken list (refreshTokens) for Organization' })
  @Get(':id/refreshtokens')
  getRefreshTokens(@Param('id') id: number) {
    return this.organizationService.getRefreshTokens(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get UserProfile list (userProfiles) for Organization' })
  @Get(':id/userprofiles')
  getUserProfiles(@Param('id') id: number) {
    return this.organizationService.getUserProfiles(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get BudgetLine list (budgetLines) for Organization' })
  @Get(':id/budgetlines')
  getBudgetLines(@Param('id') id: number) {
    return this.organizationService.getBudgetLines(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Baseline list (baselines) for Organization' })
  @Get(':id/baselines')
  getBaselines(@Param('id') id: number) {
    return this.organizationService.getBaselines(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkItemDependency list (workItemDependencies) for Organization' })
  @Get(':id/workitemdependencys')
  getWorkItemDependencys(@Param('id') id: number) {
    return this.organizationService.getWorkItemDependencys(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get RolesAndPermissions list (rolesAndPermissionses) for Organization' })
  @Get(':id/rolesandpermissionss')
  getRolesAndPermissionss(@Param('id') id: number) {
    return this.organizationService.getRolesAndPermissionss(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkflowRule list (workflowRules) for Organization' })
  @Get(':id/workflowrules')
  getWorkflowRules(@Param('id') id: number) {
    return this.organizationService.getWorkflowRules(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get MaintenanceLog list (maintenanceLogs) for Organization' })
  @Get(':id/maintenancelogs')
  getMaintenanceLogs(@Param('id') id: number) {
    return this.organizationService.getMaintenanceLogs(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Sprint list (sprints) for Organization' })
  @Get(':id/sprints')
  getSprints(@Param('id') id: number) {
    return this.organizationService.getSprints(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get PunchListItem list (punchListItems) for Organization' })
  @Get(':id/punchlistitems')
  getPunchListItems(@Param('id') id: number) {
    return this.organizationService.getPunchListItems(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ApprovalStep list (approvalSteps) for Organization' })
  @Get(':id/approvalsteps')
  getApprovalSteps(@Param('id') id: number) {
    return this.organizationService.getApprovalSteps(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Procurement list (procurements) for Organization' })
  @Get(':id/procurements')
  getProcurements(@Param('id') id: number) {
    return this.organizationService.getProcurements(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ClosureItem list (closureItems) for Organization' })
  @Get(':id/closureitems')
  getClosureItems(@Param('id') id: number) {
    return this.organizationService.getClosureItems(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get RiskMitigation list (riskMitigations) for Organization' })
  @Get(':id/riskmitigations')
  getRiskMitigations(@Param('id') id: number) {
    return this.organizationService.getRiskMitigations(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ProjectConflict list (projectConflicts) for Organization' })
  @Get(':id/projectconflicts')
  getProjectConflicts(@Param('id') id: number) {
    return this.organizationService.getProjectConflicts(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get StatusTransition list (statusTransitions) for Organization' })
  @Get(':id/statustransitions')
  getStatusTransitions(@Param('id') id: number) {
    return this.organizationService.getStatusTransitions(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Benchmark list (benchmarks) for Organization' })
  @Get(':id/benchmarks')
  getBenchmarks(@Param('id') id: number) {
    return this.organizationService.getBenchmarks(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get ApprovalRequest list (approvalRequests) for Organization' })
  @Get(':id/approvalrequests')
  getApprovalRequests(@Param('id') id: number) {
    return this.organizationService.getApprovalRequests(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkItemAssignee list (workItemAssignees) for Organization' })
  @Get(':id/workitemassignees')
  getWorkItemAssignees(@Param('id') id: number) {
    return this.organizationService.getWorkItemAssignees(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get User list (users) for Organization' })
  @Get(':id/users')
  getUsers(@Param('id') id: number) {
    return this.organizationService.getUsers(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get BaselineItem list (baselineItems) for Organization' })
  @Get(':id/baselineitems')
  getBaselineItems(@Param('id') id: number) {
    return this.organizationService.getBaselineItems(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Escalation list (escalations) for Organization' })
  @Get(':id/escalations')
  getEscalations(@Param('id') id: number) {
    return this.organizationService.getEscalations(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkflowVersion list (workflowVersions) for Organization' })
  @Get(':id/workflowversions')
  getWorkflowVersions(@Param('id') id: number) {
    return this.organizationService.getWorkflowVersions(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkflowRun list (workflowRuns) for Organization' })
  @Get(':id/workflowruns')
  getWorkflowRuns(@Param('id') id: number) {
    return this.organizationService.getWorkflowRuns(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkflowRunStep list (workflowRunSteps) for Organization' })
  @Get(':id/workflowrunsteps')
  getWorkflowRunSteps(@Param('id') id: number) {
    return this.organizationService.getWorkflowRunSteps(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkflowTask list (workflowTasks) for Organization' })
  @Get(':id/workflowtasks')
  getWorkflowTasks(@Param('id') id: number) {
    return this.organizationService.getWorkflowTasks(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkflowTimer list (workflowTimers) for Organization' })
  @Get(':id/workflowtimers')
  getWorkflowTimers(@Param('id') id: number) {
    return this.organizationService.getWorkflowTimers(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get WorkflowSchedule list (workflowSchedules) for Organization' })
  @Get(':id/workflowschedules')
  getWorkflowSchedules(@Param('id') id: number) {
    return this.organizationService.getWorkflowSchedules(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get AgentRun list (agentRuns) for Organization' })
  @Get(':id/agentruns')
  getAgentRuns(@Param('id') id: number) {
    return this.organizationService.getAgentRuns(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get AgentRunStep list (agentRunSteps) for Organization' })
  @Get(':id/agentrunsteps')
  getAgentRunSteps(@Param('id') id: number) {
    return this.organizationService.getAgentRunSteps(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get AgentConversation list (agentConversations) for Organization' })
  @Get(':id/agentconversations')
  getAgentConversations(@Param('id') id: number) {
    return this.organizationService.getAgentConversations(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get AgentMessage list (agentMessages) for Organization' })
  @Get(':id/agentmessages')
  getAgentMessages(@Param('id') id: number) {
    return this.organizationService.getAgentMessages(id);
  }

  @RequirePermission('Organization', 'read')
  @ApiOperation({ summary: 'Get Agent list (agents) for Organization' })
  @Get(':id/agents')
  getAgents(@Param('id') id: number) {
    return this.organizationService.getAgents(id);
  }

  }
