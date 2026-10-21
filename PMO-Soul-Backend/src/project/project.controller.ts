
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { ProjectService } from './project.service';
  import { CreateProjectDto } from './dto/create-project.dto';
  import { UpdateProjectDto } from './dto/update-project.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('Project')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('project')
  export class ProjectController {
  constructor(private readonly projectService: ProjectService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'Project', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all projects',
    description: 'Retrieves all projects in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('Project', 'list')
    @Get()
    async getAllProjects(
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
        
        const result: any = await this.projectService.getAllProjects({
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
      summary: 'Aggregate projects',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on Project (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see projects
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('Project', 'list')
    @Post('aggregate')
    async aggregateProjects(@Body() body: AggregateRequest){
        try {
          return await this.projectService.aggregateProject(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a project by id'})
    @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
    @RequirePermission('Project', 'read')
    @Get(':id')
    async getProjectById(@Param('id', ParseIntPipe) id:number){
        return await this.projectService.getProjectById(id);
    }

    @ApiOperation({summary:'Create a new project'})
    @RequirePermission('Project', 'create')
    @Post()
    async createProject(@Body() createProjectDto: CreateProjectDto, @Request() req){
        await this.refuseWorkflowFields(createProjectDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.projectService.createProject(createProjectDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a project'})
    @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
    @RequirePermission('Project', 'update')
    @Patch(':id')
    async updateProject(@Param('id', ParseIntPipe) id:number, @Body() updateProjectDto: UpdateProjectDto, @Request() req){
        await this.refuseWorkflowFields(updateProjectDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for project id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateProjectDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateProjectDto));
            
            const result = await this.projectService.updateProject(id, updateProjectDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a project'})
    @ApiParam({ name: 'id', type: Number, description: 'Project ID' })
    @RequirePermission('Project', 'delete')
    @Delete(':id')
    async deleteProject(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.projectService.deleteProject(id, applicationId);
    }
    
  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get ProjectCategory (projectcategory) for Project' })
  @Get(':id/projectcategory')
  getProjectCategory(@Param('id') id: number) {
    return this.projectService.getProjectCategory(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Eps (eps) for Project' })
  @Get(':id/eps')
  getEps(@Param('id') id: number) {
    return this.projectService.getEps(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Portfolio (portfolio) for Project' })
  @Get(':id/portfolio')
  getPortfolio(@Param('id') id: number) {
    return this.projectService.getPortfolio(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get User (user) for Project' })
  @Get(':id/user')
  getUser(@Param('id') id: number) {
    return this.projectService.getUser(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get User (userCreatedBy) for Project' })
  @Get(':id/usercreatedby')
  getUserCreatedBy(@Param('id') id: number) {
    return this.projectService.getUserCreatedBy(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get WorkCalendar (workcalendar) for Project' })
  @Get(':id/workcalendar')
  getWorkCalendar(@Param('id') id: number) {
    return this.projectService.getWorkCalendar(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for Project' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.projectService.getOrganization(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get ProjectMember list (projectmembers) for Project' })
  @Get(':id/projectmembers')
  getProjectMembers(@Param('id') id: number) {
    return this.projectService.getProjectMembers(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get ProjectLifecycleStep list (projectlifecyclesteps) for Project' })
  @Get(':id/projectlifecyclesteps')
  getProjectLifecycleSteps(@Param('id') id: number) {
    return this.projectService.getProjectLifecycleSteps(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get ProjectConflict list (projectconflicts) for Project' })
  @Get(':id/projectconflicts')
  getProjectConflicts(@Param('id') id: number) {
    return this.projectService.getProjectConflicts(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get WorkItemStatus list (workitemstatuss) for Project' })
  @Get(':id/workitemstatuss')
  getWorkItemStatuss(@Param('id') id: number) {
    return this.projectService.getWorkItemStatuss(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get WorkItem list (workitems) for Project' })
  @Get(':id/workitems')
  getWorkItems(@Param('id') id: number) {
    return this.projectService.getWorkItems(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get WorkflowRule list (workflowrules) for Project' })
  @Get(':id/workflowrules')
  getWorkflowRules(@Param('id') id: number) {
    return this.projectService.getWorkflowRules(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get RecurringWorkItem list (recurringworkitems) for Project' })
  @Get(':id/recurringworkitems')
  getRecurringWorkItems(@Param('id') id: number) {
    return this.projectService.getRecurringWorkItems(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get WbsNode list (wbsnodes) for Project' })
  @Get(':id/wbsnodes')
  getWbsNodes(@Param('id') id: number) {
    return this.projectService.getWbsNodes(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Baseline list (baselines) for Project' })
  @Get(':id/baselines')
  getBaselines(@Param('id') id: number) {
    return this.projectService.getBaselines(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get EvmSnapshot list (evmsnapshots) for Project' })
  @Get(':id/evmsnapshots')
  getEvmSnapshots(@Param('id') id: number) {
    return this.projectService.getEvmSnapshots(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Sprint list (sprints) for Project' })
  @Get(':id/sprints')
  getSprints(@Param('id') id: number) {
    return this.projectService.getSprints(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Release list (releases) for Project' })
  @Get(':id/releases')
  getReleases(@Param('id') id: number) {
    return this.projectService.getReleases(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Site list (sites) for Project' })
  @Get(':id/sites')
  getSites(@Param('id') id: number) {
    return this.projectService.getSites(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get BudgetLine list (budgetlines) for Project' })
  @Get(':id/budgetlines')
  getBudgetLines(@Param('id') id: number) {
    return this.projectService.getBudgetLines(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get CostTransaction list (costtransactions) for Project' })
  @Get(':id/costtransactions')
  getCostTransactions(@Param('id') id: number) {
    return this.projectService.getCostTransactions(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Risk list (risks) for Project' })
  @Get(':id/risks')
  getRisks(@Param('id') id: number) {
    return this.projectService.getRisks(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Procurement list (procurements) for Project' })
  @Get(':id/procurements')
  getProcurements(@Param('id') id: number) {
    return this.projectService.getProcurements(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Document list (documents) for Project' })
  @Get(':id/documents')
  getDocuments(@Param('id') id: number) {
    return this.projectService.getDocuments(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Timesheet list (timesheets) for Project' })
  @Get(':id/timesheets')
  getTimesheets(@Param('id') id: number) {
    return this.projectService.getTimesheets(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get TimeEntry list (timeentrys) for Project' })
  @Get(':id/timeentrys')
  getTimeEntrys(@Param('id') id: number) {
    return this.projectService.getTimeEntrys(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get ApprovalRequest list (approvalrequests) for Project' })
  @Get(':id/approvalrequests')
  getApprovalRequests(@Param('id') id: number) {
    return this.projectService.getApprovalRequests(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get ProjectClosure (projectclosure) for Project' })
  @Get(':id/projectclosure')
  getProjectClosure(@Param('id') id: number) {
    return this.projectService.getProjectClosure(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Checklist list (checklists) for Project' })
  @Get(':id/checklists')
  getChecklists(@Param('id') id: number) {
    return this.projectService.getChecklists(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get PunchListItem list (punchlistitems) for Project' })
  @Get(':id/punchlistitems')
  getPunchListItems(@Param('id') id: number) {
    return this.projectService.getPunchListItems(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Inspection list (inspections) for Project' })
  @Get(':id/inspections')
  getInspections(@Param('id') id: number) {
    return this.projectService.getInspections(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Handover list (handovers) for Project' })
  @Get(':id/handovers')
  getHandovers(@Param('id') id: number) {
    return this.projectService.getHandovers(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Alert list (alerts) for Project' })
  @Get(':id/alerts')
  getAlerts(@Param('id') id: number) {
    return this.projectService.getAlerts(id);
  }

  @RequirePermission('Project', 'read')
  @ApiOperation({ summary: 'Get Lesson list (lessons) for Project' })
  @Get(':id/lessons')
  getLessons(@Param('id') id: number) {
    return this.projectService.getLessons(id);
  }

  }
