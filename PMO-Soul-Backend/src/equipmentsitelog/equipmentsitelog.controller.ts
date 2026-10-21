
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { EquipmentSiteLogService } from './equipmentsitelog.service';
  import { CreateEquipmentSiteLogDto } from './dto/create-equipmentsitelog.dto';
  import { UpdateEquipmentSiteLogDto } from './dto/update-equipmentsitelog.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('EquipmentSiteLog')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('equipmentsitelog')
  export class EquipmentSiteLogController {
  constructor(private readonly equipmentsitelogService: EquipmentSiteLogService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'EquipmentSiteLog', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all equipmentsitelogs',
    description: 'Retrieves all equipmentsitelogs in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('EquipmentSiteLog', 'list')
    @Get()
    async getAllEquipmentSiteLogs(
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
        
        const result: any = await this.equipmentsitelogService.getAllEquipmentSiteLogs({
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
      summary: 'Aggregate equipmentsitelogs',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on EquipmentSiteLog (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see equipmentsitelogs
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('EquipmentSiteLog', 'list')
    @Post('aggregate')
    async aggregateEquipmentSiteLogs(@Body() body: AggregateRequest){
        try {
          return await this.equipmentsitelogService.aggregateEquipmentSiteLog(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a equipmentsitelog by id'})
    @ApiParam({ name: 'id', type: Number, description: 'EquipmentSiteLog ID' })
    @RequirePermission('EquipmentSiteLog', 'read')
    @Get(':id')
    async getEquipmentSiteLogById(@Param('id', ParseIntPipe) id:number){
        return await this.equipmentsitelogService.getEquipmentSiteLogById(id);
    }

    @ApiOperation({summary:'Create a new equipmentsitelog'})
    @RequirePermission('EquipmentSiteLog', 'create')
    @Post()
    async createEquipmentSiteLog(@Body() createEquipmentSiteLogDto: CreateEquipmentSiteLogDto, @Request() req){
        await this.refuseWorkflowFields(createEquipmentSiteLogDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.equipmentsitelogService.createEquipmentSiteLog(createEquipmentSiteLogDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a equipmentsitelog'})
    @ApiParam({ name: 'id', type: Number, description: 'EquipmentSiteLog ID' })
    @RequirePermission('EquipmentSiteLog', 'update')
    @Patch(':id')
    async updateEquipmentSiteLog(@Param('id', ParseIntPipe) id:number, @Body() updateEquipmentSiteLogDto: UpdateEquipmentSiteLogDto, @Request() req){
        await this.refuseWorkflowFields(updateEquipmentSiteLogDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for equipmentsitelog id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateEquipmentSiteLogDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateEquipmentSiteLogDto));
            
            const result = await this.equipmentsitelogService.updateEquipmentSiteLog(id, updateEquipmentSiteLogDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a equipmentsitelog'})
    @ApiParam({ name: 'id', type: Number, description: 'EquipmentSiteLog ID' })
    @RequirePermission('EquipmentSiteLog', 'delete')
    @Delete(':id')
    async deleteEquipmentSiteLog(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.equipmentsitelogService.deleteEquipmentSiteLog(id, applicationId);
    }
    
  @RequirePermission('EquipmentSiteLog', 'read')
  @ApiOperation({ summary: 'Get Resource (resource) for EquipmentSiteLog' })
  @Get(':id/resource')
  getResource(@Param('id') id: number) {
    return this.equipmentsitelogService.getResource(id);
  }

  @RequirePermission('EquipmentSiteLog', 'read')
  @ApiOperation({ summary: 'Get Site (site) for EquipmentSiteLog' })
  @Get(':id/site')
  getSite(@Param('id') id: number) {
    return this.equipmentsitelogService.getSite(id);
  }

  @RequirePermission('EquipmentSiteLog', 'read')
  @ApiOperation({ summary: 'Get User (user) for EquipmentSiteLog' })
  @Get(':id/user')
  getUser(@Param('id') id: number) {
    return this.equipmentsitelogService.getUser(id);
  }

  @RequirePermission('EquipmentSiteLog', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for EquipmentSiteLog' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.equipmentsitelogService.getOrganization(id);
  }

  }
