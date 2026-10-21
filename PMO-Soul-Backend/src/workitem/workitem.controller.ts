
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { WorkItemService } from './workitem.service';
  import { CreateWorkItemDto } from './dto/create-workitem.dto';
  import { UpdateWorkItemDto } from './dto/update-workitem.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('WorkItem')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('workitem')
  export class WorkItemController {
  constructor(private readonly workitemService: WorkItemService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'WorkItem', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all workitems',
    description: 'Retrieves all workitems in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('WorkItem', 'list')
    @Get()
    async getAllWorkItems(
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
        
        const result: any = await this.workitemService.getAllWorkItems({
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
      summary: 'Aggregate workitems',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on WorkItem (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see workitems
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('WorkItem', 'list')
    @Post('aggregate')
    async aggregateWorkItems(@Body() body: AggregateRequest){
        try {
          return await this.workitemService.aggregateWorkItem(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a workitem by id'})
    @ApiParam({ name: 'id', type: Number, description: 'WorkItem ID' })
    @RequirePermission('WorkItem', 'read')
    @Get(':id')
    async getWorkItemById(@Param('id', ParseIntPipe) id:number){
        return await this.workitemService.getWorkItemById(id);
    }

    @ApiOperation({summary:'Create a new workitem'})
    @RequirePermission('WorkItem', 'create')
    @Post()
    async createWorkItem(@Body() createWorkItemDto: CreateWorkItemDto, @Request() req){
        await this.refuseWorkflowFields(createWorkItemDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.workitemService.createWorkItem(createWorkItemDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a workitem'})
    @ApiParam({ name: 'id', type: Number, description: 'WorkItem ID' })
    @RequirePermission('WorkItem', 'update')
    @Patch(':id')
    async updateWorkItem(@Param('id', ParseIntPipe) id:number, @Body() updateWorkItemDto: UpdateWorkItemDto, @Request() req){
        await this.refuseWorkflowFields(updateWorkItemDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for workitem id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateWorkItemDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateWorkItemDto));
            
            const result = await this.workitemService.updateWorkItem(id, updateWorkItemDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a workitem'})
    @ApiParam({ name: 'id', type: Number, description: 'WorkItem ID' })
    @RequirePermission('WorkItem', 'delete')
    @Delete(':id')
    async deleteWorkItem(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.workitemService.deleteWorkItem(id, applicationId);
    }
    
  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get Project (project) for WorkItem' })
  @Get(':id/project')
  getProject(@Param('id') id: number) {
    return this.workitemService.getProject(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get WorkItem (workitem) for WorkItem' })
  @Get(':id/workitem')
  getWorkItem(@Param('id') id: number) {
    return this.workitemService.getWorkItem(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get WorkItem list (workitems) for WorkItem' })
  @Get(':id/workitems')
  getWorkItems(@Param('id') id: number) {
    return this.workitemService.getWorkItems(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get WbsNode (wbsnode) for WorkItem' })
  @Get(':id/wbsnode')
  getWbsNode(@Param('id') id: number) {
    return this.workitemService.getWbsNode(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get Sprint (sprint) for WorkItem' })
  @Get(':id/sprint')
  getSprint(@Param('id') id: number) {
    return this.workitemService.getSprint(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get Release (release) for WorkItem' })
  @Get(':id/release')
  getRelease(@Param('id') id: number) {
    return this.workitemService.getRelease(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get WorkItemStatus (workitemstatus) for WorkItem' })
  @Get(':id/workitemstatus')
  getWorkItemStatus(@Param('id') id: number) {
    return this.workitemService.getWorkItemStatus(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get User (user) for WorkItem' })
  @Get(':id/user')
  getUser(@Param('id') id: number) {
    return this.workitemService.getUser(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get User (userCreatedBy) for WorkItem' })
  @Get(':id/usercreatedby')
  getUserCreatedBy(@Param('id') id: number) {
    return this.workitemService.getUserCreatedBy(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get WorkItemAssignee list (workitemassignees) for WorkItem' })
  @Get(':id/workitemassignees')
  getWorkItemAssignees(@Param('id') id: number) {
    return this.workitemService.getWorkItemAssignees(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get WorkItemDependency list (workitemdependencys) for WorkItem' })
  @Get(':id/workitemdependencys')
  getWorkItemDependencys(@Param('id') id: number) {
    return this.workitemService.getWorkItemDependencys(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get WorkItemDependency list (workitemdependencysSuccessor) for WorkItem' })
  @Get(':id/workitemdependencyssuccessor')
  getWorkitemdependencysSuccessor(@Param('id') id: number) {
    return this.workitemService.getWorkitemdependencysSuccessor(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get WorkItemLink list (workitemlinks) for WorkItem' })
  @Get(':id/workitemlinks')
  getWorkItemLinks(@Param('id') id: number) {
    return this.workitemService.getWorkItemLinks(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get WorkItemLink list (workitemlinksTarget) for WorkItem' })
  @Get(':id/workitemlinkstarget')
  getWorkitemlinksTarget(@Param('id') id: number) {
    return this.workitemService.getWorkitemlinksTarget(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get StatusTransition list (statustransitions) for WorkItem' })
  @Get(':id/statustransitions')
  getStatusTransitions(@Param('id') id: number) {
    return this.workitemService.getStatusTransitions(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get Comment list (comments) for WorkItem' })
  @Get(':id/comments')
  getComments(@Param('id') id: number) {
    return this.workitemService.getComments(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get WorkflowRule list (workflowrules) for WorkItem' })
  @Get(':id/workflowrules')
  getWorkflowRules(@Param('id') id: number) {
    return this.workitemService.getWorkflowRules(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get WorkflowRule list (workflowrulesActionItem) for WorkItem' })
  @Get(':id/workflowrulesactionitem')
  getWorkflowrulesActionItem(@Param('id') id: number) {
    return this.workitemService.getWorkflowrulesActionItem(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get BaselineItem list (baselineitems) for WorkItem' })
  @Get(':id/baselineitems')
  getBaselineItems(@Param('id') id: number) {
    return this.workitemService.getBaselineItems(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get Release list (releases) for WorkItem' })
  @Get(':id/releases')
  getReleases(@Param('id') id: number) {
    return this.workitemService.getReleases(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get ResourceAssignment list (resourceassignments) for WorkItem' })
  @Get(':id/resourceassignments')
  getResourceAssignments(@Param('id') id: number) {
    return this.workitemService.getResourceAssignments(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get ProgressReport list (progressreports) for WorkItem' })
  @Get(':id/progressreports')
  getProgressReports(@Param('id') id: number) {
    return this.workitemService.getProgressReports(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get BudgetLine list (budgetlines) for WorkItem' })
  @Get(':id/budgetlines')
  getBudgetLines(@Param('id') id: number) {
    return this.workitemService.getBudgetLines(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get RiskMitigation list (riskmitigations) for WorkItem' })
  @Get(':id/riskmitigations')
  getRiskMitigations(@Param('id') id: number) {
    return this.workitemService.getRiskMitigations(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get Document list (documents) for WorkItem' })
  @Get(':id/documents')
  getDocuments(@Param('id') id: number) {
    return this.workitemService.getDocuments(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get TimeEntry list (timeentrys) for WorkItem' })
  @Get(':id/timeentrys')
  getTimeEntrys(@Param('id') id: number) {
    return this.workitemService.getTimeEntrys(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get Escalation list (escalations) for WorkItem' })
  @Get(':id/escalations')
  getEscalations(@Param('id') id: number) {
    return this.workitemService.getEscalations(id);
  }

  @RequirePermission('WorkItem', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for WorkItem' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.workitemService.getOrganization(id);
  }

  }
