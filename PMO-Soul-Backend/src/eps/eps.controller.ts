
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { EpsService } from './eps.service';
  import { CreateEpsDto } from './dto/create-eps.dto';
  import { UpdateEpsDto } from './dto/update-eps.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('Eps')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('eps')
  export class EpsController {
  constructor(private readonly epsService: EpsService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'Eps', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all epss',
    description: 'Retrieves all epss in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('Eps', 'list')
    @Get()
    async getAllEpss(
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
        
        const result: any = await this.epsService.getAllEpss({
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
      summary: 'Aggregate epss',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on Eps (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see epss
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('Eps', 'list')
    @Post('aggregate')
    async aggregateEpss(@Body() body: AggregateRequest){
        try {
          return await this.epsService.aggregateEps(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a eps by id'})
    @ApiParam({ name: 'id', type: Number, description: 'Eps ID' })
    @RequirePermission('Eps', 'read')
    @Get(':id')
    async getEpsById(@Param('id', ParseIntPipe) id:number){
        return await this.epsService.getEpsById(id);
    }

    @ApiOperation({summary:'Create a new eps'})
    @RequirePermission('Eps', 'create')
    @Post()
    async createEps(@Body() createEpsDto: CreateEpsDto, @Request() req){
        await this.refuseWorkflowFields(createEpsDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.epsService.createEps(createEpsDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a eps'})
    @ApiParam({ name: 'id', type: Number, description: 'Eps ID' })
    @RequirePermission('Eps', 'update')
    @Patch(':id')
    async updateEps(@Param('id', ParseIntPipe) id:number, @Body() updateEpsDto: UpdateEpsDto, @Request() req){
        await this.refuseWorkflowFields(updateEpsDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for eps id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateEpsDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateEpsDto));
            
            const result = await this.epsService.updateEps(id, updateEpsDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a eps'})
    @ApiParam({ name: 'id', type: Number, description: 'Eps ID' })
    @RequirePermission('Eps', 'delete')
    @Delete(':id')
    async deleteEps(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.epsService.deleteEps(id, applicationId);
    }
    
  @RequirePermission('Eps', 'read')
  @ApiOperation({ summary: 'Get Eps (eps) for Eps' })
  @Get(':id/eps')
  getEps(@Param('id') id: number) {
    return this.epsService.getEps(id);
  }

  @RequirePermission('Eps', 'read')
  @ApiOperation({ summary: 'Get Eps list (epss) for Eps' })
  @Get(':id/epss')
  getEpss(@Param('id') id: number) {
    return this.epsService.getEpss(id);
  }

  @RequirePermission('Eps', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for Eps' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.epsService.getOrganization(id);
  }

  @RequirePermission('Eps', 'read')
  @ApiOperation({ summary: 'Get Project list (projects) for Eps' })
  @Get(':id/projects')
  getProjects(@Param('id') id: number) {
    return this.epsService.getProjects(id);
  }

  }
