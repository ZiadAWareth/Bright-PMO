
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { ProcurementService } from './procurement.service';
  import { CreateProcurementDto } from './dto/create-procurement.dto';
  import { UpdateProcurementDto } from './dto/update-procurement.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('Procurement')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('procurement')
  export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'Procurement', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all procurements',
    description: 'Retrieves all procurements in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('Procurement', 'list')
    @Get()
    async getAllProcurements(
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
        
        const result: any = await this.procurementService.getAllProcurements({
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
      summary: 'Aggregate procurements',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on Procurement (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see procurements
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('Procurement', 'list')
    @Post('aggregate')
    async aggregateProcurements(@Body() body: AggregateRequest){
        try {
          return await this.procurementService.aggregateProcurement(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a procurement by id'})
    @ApiParam({ name: 'id', type: Number, description: 'Procurement ID' })
    @RequirePermission('Procurement', 'read')
    @Get(':id')
    async getProcurementById(@Param('id', ParseIntPipe) id:number){
        return await this.procurementService.getProcurementById(id);
    }

    @ApiOperation({summary:'Create a new procurement'})
    @RequirePermission('Procurement', 'create')
    @Post()
    async createProcurement(@Body() createProcurementDto: CreateProcurementDto, @Request() req){
        await this.refuseWorkflowFields(createProcurementDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.procurementService.createProcurement(createProcurementDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a procurement'})
    @ApiParam({ name: 'id', type: Number, description: 'Procurement ID' })
    @RequirePermission('Procurement', 'update')
    @Patch(':id')
    async updateProcurement(@Param('id', ParseIntPipe) id:number, @Body() updateProcurementDto: UpdateProcurementDto, @Request() req){
        await this.refuseWorkflowFields(updateProcurementDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for procurement id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateProcurementDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateProcurementDto));
            
            const result = await this.procurementService.updateProcurement(id, updateProcurementDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a procurement'})
    @ApiParam({ name: 'id', type: Number, description: 'Procurement ID' })
    @RequirePermission('Procurement', 'delete')
    @Delete(':id')
    async deleteProcurement(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.procurementService.deleteProcurement(id, applicationId);
    }
    
  @RequirePermission('Procurement', 'read')
  @ApiOperation({ summary: 'Get Project (project) for Procurement' })
  @Get(':id/project')
  getProject(@Param('id') id: number) {
    return this.procurementService.getProject(id);
  }

  @RequirePermission('Procurement', 'read')
  @ApiOperation({ summary: 'Get WbsNode (wbsnode) for Procurement' })
  @Get(':id/wbsnode')
  getWbsNode(@Param('id') id: number) {
    return this.procurementService.getWbsNode(id);
  }

  @RequirePermission('Procurement', 'read')
  @ApiOperation({ summary: 'Get RfqResponse list (rfqresponses) for Procurement' })
  @Get(':id/rfqresponses')
  getRfqResponses(@Param('id') id: number) {
    return this.procurementService.getRfqResponses(id);
  }

  @RequirePermission('Procurement', 'read')
  @ApiOperation({ summary: 'Get Contract list (contracts) for Procurement' })
  @Get(':id/contracts')
  getContracts(@Param('id') id: number) {
    return this.procurementService.getContracts(id);
  }

  @RequirePermission('Procurement', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for Procurement' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.procurementService.getOrganization(id);
  }

  }
