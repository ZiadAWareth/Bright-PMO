
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { BudgetLineService } from './budgetline.service';
  import { CreateBudgetLineDto } from './dto/create-budgetline.dto';
  import { UpdateBudgetLineDto } from './dto/update-budgetline.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('BudgetLine')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('budgetline')
  export class BudgetLineController {
  constructor(private readonly budgetlineService: BudgetLineService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'BudgetLine', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all budgetlines',
    description: 'Retrieves all budgetlines in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('BudgetLine', 'list')
    @Get()
    async getAllBudgetLines(
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
        
        const result: any = await this.budgetlineService.getAllBudgetLines({
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
      summary: 'Aggregate budgetlines',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on BudgetLine (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see budgetlines
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('BudgetLine', 'list')
    @Post('aggregate')
    async aggregateBudgetLines(@Body() body: AggregateRequest){
        try {
          return await this.budgetlineService.aggregateBudgetLine(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a budgetline by id'})
    @ApiParam({ name: 'id', type: Number, description: 'BudgetLine ID' })
    @RequirePermission('BudgetLine', 'read')
    @Get(':id')
    async getBudgetLineById(@Param('id', ParseIntPipe) id:number){
        return await this.budgetlineService.getBudgetLineById(id);
    }

    @ApiOperation({summary:'Create a new budgetline'})
    @RequirePermission('BudgetLine', 'create')
    @Post()
    async createBudgetLine(@Body() createBudgetLineDto: CreateBudgetLineDto, @Request() req){
        await this.refuseWorkflowFields(createBudgetLineDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.budgetlineService.createBudgetLine(createBudgetLineDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a budgetline'})
    @ApiParam({ name: 'id', type: Number, description: 'BudgetLine ID' })
    @RequirePermission('BudgetLine', 'update')
    @Patch(':id')
    async updateBudgetLine(@Param('id', ParseIntPipe) id:number, @Body() updateBudgetLineDto: UpdateBudgetLineDto, @Request() req){
        await this.refuseWorkflowFields(updateBudgetLineDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for budgetline id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateBudgetLineDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateBudgetLineDto));
            
            const result = await this.budgetlineService.updateBudgetLine(id, updateBudgetLineDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a budgetline'})
    @ApiParam({ name: 'id', type: Number, description: 'BudgetLine ID' })
    @RequirePermission('BudgetLine', 'delete')
    @Delete(':id')
    async deleteBudgetLine(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.budgetlineService.deleteBudgetLine(id, applicationId);
    }
    
  @RequirePermission('BudgetLine', 'read')
  @ApiOperation({ summary: 'Get Project (project) for BudgetLine' })
  @Get(':id/project')
  getProject(@Param('id') id: number) {
    return this.budgetlineService.getProject(id);
  }

  @RequirePermission('BudgetLine', 'read')
  @ApiOperation({ summary: 'Get WbsNode (wbsnode) for BudgetLine' })
  @Get(':id/wbsnode')
  getWbsNode(@Param('id') id: number) {
    return this.budgetlineService.getWbsNode(id);
  }

  @RequirePermission('BudgetLine', 'read')
  @ApiOperation({ summary: 'Get WorkItem (workitem) for BudgetLine' })
  @Get(':id/workitem')
  getWorkItem(@Param('id') id: number) {
    return this.budgetlineService.getWorkItem(id);
  }

  @RequirePermission('BudgetLine', 'read')
  @ApiOperation({ summary: 'Get CostTransaction list (costtransactions) for BudgetLine' })
  @Get(':id/costtransactions')
  getCostTransactions(@Param('id') id: number) {
    return this.budgetlineService.getCostTransactions(id);
  }

  @RequirePermission('BudgetLine', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for BudgetLine' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.budgetlineService.getOrganization(id);
  }

  }
