
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { WorkItemStatusService } from './workitemstatus.service';
  import { CreateWorkItemStatusDto } from './dto/create-workitemstatus.dto';
  import { UpdateWorkItemStatusDto } from './dto/update-workitemstatus.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('WorkItemStatus')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('workitemstatus')
  export class WorkItemStatusController {
  constructor(private readonly workitemstatusService: WorkItemStatusService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'WorkItemStatus', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all workitemstatuss',
    description: 'Retrieves all workitemstatuss in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('WorkItemStatus', 'list')
    @Get()
    async getAllWorkItemStatuss(
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
        
        const result: any = await this.workitemstatusService.getAllWorkItemStatuss({
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
      summary: 'Aggregate workitemstatuss',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on WorkItemStatus (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see workitemstatuss
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('WorkItemStatus', 'list')
    @Post('aggregate')
    async aggregateWorkItemStatuss(@Body() body: AggregateRequest){
        try {
          return await this.workitemstatusService.aggregateWorkItemStatus(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a workitemstatus by id'})
    @ApiParam({ name: 'id', type: Number, description: 'WorkItemStatus ID' })
    @RequirePermission('WorkItemStatus', 'read')
    @Get(':id')
    async getWorkItemStatusById(@Param('id', ParseIntPipe) id:number){
        return await this.workitemstatusService.getWorkItemStatusById(id);
    }

    @ApiOperation({summary:'Create a new workitemstatus'})
    @RequirePermission('WorkItemStatus', 'create')
    @Post()
    async createWorkItemStatus(@Body() createWorkItemStatusDto: CreateWorkItemStatusDto, @Request() req){
        await this.refuseWorkflowFields(createWorkItemStatusDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.workitemstatusService.createWorkItemStatus(createWorkItemStatusDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a workitemstatus'})
    @ApiParam({ name: 'id', type: Number, description: 'WorkItemStatus ID' })
    @RequirePermission('WorkItemStatus', 'update')
    @Patch(':id')
    async updateWorkItemStatus(@Param('id', ParseIntPipe) id:number, @Body() updateWorkItemStatusDto: UpdateWorkItemStatusDto, @Request() req){
        await this.refuseWorkflowFields(updateWorkItemStatusDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for workitemstatus id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateWorkItemStatusDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateWorkItemStatusDto));
            
            const result = await this.workitemstatusService.updateWorkItemStatus(id, updateWorkItemStatusDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a workitemstatus'})
    @ApiParam({ name: 'id', type: Number, description: 'WorkItemStatus ID' })
    @RequirePermission('WorkItemStatus', 'delete')
    @Delete(':id')
    async deleteWorkItemStatus(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.workitemstatusService.deleteWorkItemStatus(id, applicationId);
    }
    
  @RequirePermission('WorkItemStatus', 'read')
  @ApiOperation({ summary: 'Get Project (project) for WorkItemStatus' })
  @Get(':id/project')
  getProject(@Param('id') id: number) {
    return this.workitemstatusService.getProject(id);
  }

  @RequirePermission('WorkItemStatus', 'read')
  @ApiOperation({ summary: 'Get WorkItem list (workitems) for WorkItemStatus' })
  @Get(':id/workitems')
  getWorkItems(@Param('id') id: number) {
    return this.workitemstatusService.getWorkItems(id);
  }

  @RequirePermission('WorkItemStatus', 'read')
  @ApiOperation({ summary: 'Get StatusTransition list (statustransitions) for WorkItemStatus' })
  @Get(':id/statustransitions')
  getStatusTransitions(@Param('id') id: number) {
    return this.workitemstatusService.getStatusTransitions(id);
  }

  @RequirePermission('WorkItemStatus', 'read')
  @ApiOperation({ summary: 'Get StatusTransition list (statustransitionsToStatus) for WorkItemStatus' })
  @Get(':id/statustransitionstostatus')
  getStatustransitionsToStatus(@Param('id') id: number) {
    return this.workitemstatusService.getStatustransitionsToStatus(id);
  }

  @RequirePermission('WorkItemStatus', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for WorkItemStatus' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.workitemstatusService.getOrganization(id);
  }

  }
