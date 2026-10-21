
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { RecurringWorkItemService } from './recurringworkitem.service';
  import { CreateRecurringWorkItemDto } from './dto/create-recurringworkitem.dto';
  import { UpdateRecurringWorkItemDto } from './dto/update-recurringworkitem.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('RecurringWorkItem')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('recurringworkitem')
  export class RecurringWorkItemController {
  constructor(private readonly recurringworkitemService: RecurringWorkItemService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'RecurringWorkItem', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all recurringworkitems',
    description: 'Retrieves all recurringworkitems in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('RecurringWorkItem', 'list')
    @Get()
    async getAllRecurringWorkItems(
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
        
        const result: any = await this.recurringworkitemService.getAllRecurringWorkItems({
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
      summary: 'Aggregate recurringworkitems',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on RecurringWorkItem (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see recurringworkitems
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('RecurringWorkItem', 'list')
    @Post('aggregate')
    async aggregateRecurringWorkItems(@Body() body: AggregateRequest){
        try {
          return await this.recurringworkitemService.aggregateRecurringWorkItem(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a recurringworkitem by id'})
    @ApiParam({ name: 'id', type: Number, description: 'RecurringWorkItem ID' })
    @RequirePermission('RecurringWorkItem', 'read')
    @Get(':id')
    async getRecurringWorkItemById(@Param('id', ParseIntPipe) id:number){
        return await this.recurringworkitemService.getRecurringWorkItemById(id);
    }

    @ApiOperation({summary:'Create a new recurringworkitem'})
    @RequirePermission('RecurringWorkItem', 'create')
    @Post()
    async createRecurringWorkItem(@Body() createRecurringWorkItemDto: CreateRecurringWorkItemDto, @Request() req){
        await this.refuseWorkflowFields(createRecurringWorkItemDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.recurringworkitemService.createRecurringWorkItem(createRecurringWorkItemDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a recurringworkitem'})
    @ApiParam({ name: 'id', type: Number, description: 'RecurringWorkItem ID' })
    @RequirePermission('RecurringWorkItem', 'update')
    @Patch(':id')
    async updateRecurringWorkItem(@Param('id', ParseIntPipe) id:number, @Body() updateRecurringWorkItemDto: UpdateRecurringWorkItemDto, @Request() req){
        await this.refuseWorkflowFields(updateRecurringWorkItemDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for recurringworkitem id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateRecurringWorkItemDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateRecurringWorkItemDto));
            
            const result = await this.recurringworkitemService.updateRecurringWorkItem(id, updateRecurringWorkItemDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a recurringworkitem'})
    @ApiParam({ name: 'id', type: Number, description: 'RecurringWorkItem ID' })
    @RequirePermission('RecurringWorkItem', 'delete')
    @Delete(':id')
    async deleteRecurringWorkItem(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.recurringworkitemService.deleteRecurringWorkItem(id, applicationId);
    }
    
  @RequirePermission('RecurringWorkItem', 'read')
  @ApiOperation({ summary: 'Get Project (project) for RecurringWorkItem' })
  @Get(':id/project')
  getProject(@Param('id') id: number) {
    return this.recurringworkitemService.getProject(id);
  }

  @RequirePermission('RecurringWorkItem', 'read')
  @ApiOperation({ summary: 'Get WbsNode (wbsnode) for RecurringWorkItem' })
  @Get(':id/wbsnode')
  getWbsNode(@Param('id') id: number) {
    return this.recurringworkitemService.getWbsNode(id);
  }

  @RequirePermission('RecurringWorkItem', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for RecurringWorkItem' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.recurringworkitemService.getOrganization(id);
  }

  }
