
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { RiskMitigationService } from './riskmitigation.service';
  import { CreateRiskMitigationDto } from './dto/create-riskmitigation.dto';
  import { UpdateRiskMitigationDto } from './dto/update-riskmitigation.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('RiskMitigation')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('riskmitigation')
  export class RiskMitigationController {
  constructor(private readonly riskmitigationService: RiskMitigationService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'RiskMitigation', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all riskmitigations',
    description: 'Retrieves all riskmitigations in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('RiskMitigation', 'list')
    @Get()
    async getAllRiskMitigations(
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
        
        const result: any = await this.riskmitigationService.getAllRiskMitigations({
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
      summary: 'Aggregate riskmitigations',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on RiskMitigation (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see riskmitigations
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('RiskMitigation', 'list')
    @Post('aggregate')
    async aggregateRiskMitigations(@Body() body: AggregateRequest){
        try {
          return await this.riskmitigationService.aggregateRiskMitigation(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a riskmitigation by id'})
    @ApiParam({ name: 'id', type: Number, description: 'RiskMitigation ID' })
    @RequirePermission('RiskMitigation', 'read')
    @Get(':id')
    async getRiskMitigationById(@Param('id', ParseIntPipe) id:number){
        return await this.riskmitigationService.getRiskMitigationById(id);
    }

    @ApiOperation({summary:'Create a new riskmitigation'})
    @RequirePermission('RiskMitigation', 'create')
    @Post()
    async createRiskMitigation(@Body() createRiskMitigationDto: CreateRiskMitigationDto, @Request() req){
        await this.refuseWorkflowFields(createRiskMitigationDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.riskmitigationService.createRiskMitigation(createRiskMitigationDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a riskmitigation'})
    @ApiParam({ name: 'id', type: Number, description: 'RiskMitigation ID' })
    @RequirePermission('RiskMitigation', 'update')
    @Patch(':id')
    async updateRiskMitigation(@Param('id', ParseIntPipe) id:number, @Body() updateRiskMitigationDto: UpdateRiskMitigationDto, @Request() req){
        await this.refuseWorkflowFields(updateRiskMitigationDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for riskmitigation id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateRiskMitigationDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateRiskMitigationDto));
            
            const result = await this.riskmitigationService.updateRiskMitigation(id, updateRiskMitigationDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a riskmitigation'})
    @ApiParam({ name: 'id', type: Number, description: 'RiskMitigation ID' })
    @RequirePermission('RiskMitigation', 'delete')
    @Delete(':id')
    async deleteRiskMitigation(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.riskmitigationService.deleteRiskMitigation(id, applicationId);
    }
    
  @RequirePermission('RiskMitigation', 'read')
  @ApiOperation({ summary: 'Get Risk (risk) for RiskMitigation' })
  @Get(':id/risk')
  getRisk(@Param('id') id: number) {
    return this.riskmitigationService.getRisk(id);
  }

  @RequirePermission('RiskMitigation', 'read')
  @ApiOperation({ summary: 'Get WorkItem (workitem) for RiskMitigation' })
  @Get(':id/workitem')
  getWorkItem(@Param('id') id: number) {
    return this.riskmitigationService.getWorkItem(id);
  }

  @RequirePermission('RiskMitigation', 'read')
  @ApiOperation({ summary: 'Get User (user) for RiskMitigation' })
  @Get(':id/user')
  getUser(@Param('id') id: number) {
    return this.riskmitigationService.getUser(id);
  }

  @RequirePermission('RiskMitigation', 'read')
  @ApiOperation({ summary: 'Get User (userAssignee) for RiskMitigation' })
  @Get(':id/userassignee')
  getUserAssignee(@Param('id') id: number) {
    return this.riskmitigationService.getUserAssignee(id);
  }

  @RequirePermission('RiskMitigation', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for RiskMitigation' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.riskmitigationService.getOrganization(id);
  }

  }
