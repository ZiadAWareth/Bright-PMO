
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { WbsNodeService } from './wbsnode.service';
  import { CreateWbsNodeDto } from './dto/create-wbsnode.dto';
  import { UpdateWbsNodeDto } from './dto/update-wbsnode.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('WbsNode')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('wbsnode')
  export class WbsNodeController {
  constructor(private readonly wbsnodeService: WbsNodeService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'WbsNode', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all wbsnodes',
    description: 'Retrieves all wbsnodes in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('WbsNode', 'list')
    @Get()
    async getAllWbsNodes(
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
        
        const result: any = await this.wbsnodeService.getAllWbsNodes({
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
      summary: 'Aggregate wbsnodes',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on WbsNode (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see wbsnodes
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('WbsNode', 'list')
    @Post('aggregate')
    async aggregateWbsNodes(@Body() body: AggregateRequest){
        try {
          return await this.wbsnodeService.aggregateWbsNode(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a wbsnode by id'})
    @ApiParam({ name: 'id', type: Number, description: 'WbsNode ID' })
    @RequirePermission('WbsNode', 'read')
    @Get(':id')
    async getWbsNodeById(@Param('id', ParseIntPipe) id:number){
        return await this.wbsnodeService.getWbsNodeById(id);
    }

    @ApiOperation({summary:'Create a new wbsnode'})
    @RequirePermission('WbsNode', 'create')
    @Post()
    async createWbsNode(@Body() createWbsNodeDto: CreateWbsNodeDto, @Request() req){
        await this.refuseWorkflowFields(createWbsNodeDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.wbsnodeService.createWbsNode(createWbsNodeDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a wbsnode'})
    @ApiParam({ name: 'id', type: Number, description: 'WbsNode ID' })
    @RequirePermission('WbsNode', 'update')
    @Patch(':id')
    async updateWbsNode(@Param('id', ParseIntPipe) id:number, @Body() updateWbsNodeDto: UpdateWbsNodeDto, @Request() req){
        await this.refuseWorkflowFields(updateWbsNodeDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for wbsnode id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateWbsNodeDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateWbsNodeDto));
            
            const result = await this.wbsnodeService.updateWbsNode(id, updateWbsNodeDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a wbsnode'})
    @ApiParam({ name: 'id', type: Number, description: 'WbsNode ID' })
    @RequirePermission('WbsNode', 'delete')
    @Delete(':id')
    async deleteWbsNode(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.wbsnodeService.deleteWbsNode(id, applicationId);
    }
    
  @RequirePermission('WbsNode', 'read')
  @ApiOperation({ summary: 'Get WorkItem list (workitems) for WbsNode' })
  @Get(':id/workitems')
  getWorkItems(@Param('id') id: number) {
    return this.wbsnodeService.getWorkItems(id);
  }

  @RequirePermission('WbsNode', 'read')
  @ApiOperation({ summary: 'Get RecurringWorkItem list (recurringworkitems) for WbsNode' })
  @Get(':id/recurringworkitems')
  getRecurringWorkItems(@Param('id') id: number) {
    return this.wbsnodeService.getRecurringWorkItems(id);
  }

  @RequirePermission('WbsNode', 'read')
  @ApiOperation({ summary: 'Get Project (project) for WbsNode' })
  @Get(':id/project')
  getProject(@Param('id') id: number) {
    return this.wbsnodeService.getProject(id);
  }

  @RequirePermission('WbsNode', 'read')
  @ApiOperation({ summary: 'Get WbsNode (wbsnode) for WbsNode' })
  @Get(':id/wbsnode')
  getWbsNode(@Param('id') id: number) {
    return this.wbsnodeService.getWbsNode(id);
  }

  @RequirePermission('WbsNode', 'read')
  @ApiOperation({ summary: 'Get WbsNode list (wbsnodes) for WbsNode' })
  @Get(':id/wbsnodes')
  getWbsNodes(@Param('id') id: number) {
    return this.wbsnodeService.getWbsNodes(id);
  }

  @RequirePermission('WbsNode', 'read')
  @ApiOperation({ summary: 'Get Sprint list (sprints) for WbsNode' })
  @Get(':id/sprints')
  getSprints(@Param('id') id: number) {
    return this.wbsnodeService.getSprints(id);
  }

  @RequirePermission('WbsNode', 'read')
  @ApiOperation({ summary: 'Get BudgetLine list (budgetlines) for WbsNode' })
  @Get(':id/budgetlines')
  getBudgetLines(@Param('id') id: number) {
    return this.wbsnodeService.getBudgetLines(id);
  }

  @RequirePermission('WbsNode', 'read')
  @ApiOperation({ summary: 'Get Procurement list (procurements) for WbsNode' })
  @Get(':id/procurements')
  getProcurements(@Param('id') id: number) {
    return this.wbsnodeService.getProcurements(id);
  }

  @RequirePermission('WbsNode', 'read')
  @ApiOperation({ summary: 'Get Document list (documents) for WbsNode' })
  @Get(':id/documents')
  getDocuments(@Param('id') id: number) {
    return this.wbsnodeService.getDocuments(id);
  }

  @RequirePermission('WbsNode', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for WbsNode' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.wbsnodeService.getOrganization(id);
  }

  }
