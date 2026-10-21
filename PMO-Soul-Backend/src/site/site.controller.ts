
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { SiteService } from './site.service';
  import { CreateSiteDto } from './dto/create-site.dto';
  import { UpdateSiteDto } from './dto/update-site.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('Site')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('site')
  export class SiteController {
  constructor(private readonly siteService: SiteService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'Site', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all sites',
    description: 'Retrieves all sites in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('Site', 'list')
    @Get()
    async getAllSites(
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
        
        const result: any = await this.siteService.getAllSites({
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
      summary: 'Aggregate sites',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on Site (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see sites
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('Site', 'list')
    @Post('aggregate')
    async aggregateSites(@Body() body: AggregateRequest){
        try {
          return await this.siteService.aggregateSite(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a site by id'})
    @ApiParam({ name: 'id', type: Number, description: 'Site ID' })
    @RequirePermission('Site', 'read')
    @Get(':id')
    async getSiteById(@Param('id', ParseIntPipe) id:number){
        return await this.siteService.getSiteById(id);
    }

    @ApiOperation({summary:'Create a new site'})
    @RequirePermission('Site', 'create')
    @Post()
    async createSite(@Body() createSiteDto: CreateSiteDto, @Request() req){
        await this.refuseWorkflowFields(createSiteDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.siteService.createSite(createSiteDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a site'})
    @ApiParam({ name: 'id', type: Number, description: 'Site ID' })
    @RequirePermission('Site', 'update')
    @Patch(':id')
    async updateSite(@Param('id', ParseIntPipe) id:number, @Body() updateSiteDto: UpdateSiteDto, @Request() req){
        await this.refuseWorkflowFields(updateSiteDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for site id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateSiteDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateSiteDto));
            
            const result = await this.siteService.updateSite(id, updateSiteDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a site'})
    @ApiParam({ name: 'id', type: Number, description: 'Site ID' })
    @RequirePermission('Site', 'delete')
    @Delete(':id')
    async deleteSite(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.siteService.deleteSite(id, applicationId);
    }
    
  @RequirePermission('Site', 'read')
  @ApiOperation({ summary: 'Get Project (project) for Site' })
  @Get(':id/project')
  getProject(@Param('id') id: number) {
    return this.siteService.getProject(id);
  }

  @RequirePermission('Site', 'read')
  @ApiOperation({ summary: 'Get User (user) for Site' })
  @Get(':id/user')
  getUser(@Param('id') id: number) {
    return this.siteService.getUser(id);
  }

  @RequirePermission('Site', 'read')
  @ApiOperation({ summary: 'Get EquipmentSiteLog list (equipmentsitelogs) for Site' })
  @Get(':id/equipmentsitelogs')
  getEquipmentSiteLogs(@Param('id') id: number) {
    return this.siteService.getEquipmentSiteLogs(id);
  }

  @RequirePermission('Site', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for Site' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.siteService.getOrganization(id);
  }

  }
