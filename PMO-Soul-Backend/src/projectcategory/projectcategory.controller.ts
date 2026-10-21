
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { ProjectCategoryService } from './projectcategory.service';
  import { CreateProjectCategoryDto } from './dto/create-projectcategory.dto';
  import { UpdateProjectCategoryDto } from './dto/update-projectcategory.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('ProjectCategory')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('projectcategory')
  export class ProjectCategoryController {
  constructor(private readonly projectcategoryService: ProjectCategoryService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'ProjectCategory', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all projectcategorys',
    description: 'Retrieves all projectcategorys in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('ProjectCategory', 'list')
    @Get()
    async getAllProjectCategorys(
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
        
        const result: any = await this.projectcategoryService.getAllProjectCategorys({
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
      summary: 'Aggregate projectcategorys',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on ProjectCategory (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see projectcategorys
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('ProjectCategory', 'list')
    @Post('aggregate')
    async aggregateProjectCategorys(@Body() body: AggregateRequest){
        try {
          return await this.projectcategoryService.aggregateProjectCategory(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a projectcategory by id'})
    @ApiParam({ name: 'id', type: Number, description: 'ProjectCategory ID' })
    @RequirePermission('ProjectCategory', 'read')
    @Get(':id')
    async getProjectCategoryById(@Param('id', ParseIntPipe) id:number){
        return await this.projectcategoryService.getProjectCategoryById(id);
    }

    @ApiOperation({summary:'Create a new projectcategory'})
    @RequirePermission('ProjectCategory', 'create')
    @Post()
    async createProjectCategory(@Body() createProjectCategoryDto: CreateProjectCategoryDto, @Request() req){
        await this.refuseWorkflowFields(createProjectCategoryDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.projectcategoryService.createProjectCategory(createProjectCategoryDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a projectcategory'})
    @ApiParam({ name: 'id', type: Number, description: 'ProjectCategory ID' })
    @RequirePermission('ProjectCategory', 'update')
    @Patch(':id')
    async updateProjectCategory(@Param('id', ParseIntPipe) id:number, @Body() updateProjectCategoryDto: UpdateProjectCategoryDto, @Request() req){
        await this.refuseWorkflowFields(updateProjectCategoryDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for projectcategory id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateProjectCategoryDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateProjectCategoryDto));
            
            const result = await this.projectcategoryService.updateProjectCategory(id, updateProjectCategoryDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a projectcategory'})
    @ApiParam({ name: 'id', type: Number, description: 'ProjectCategory ID' })
    @RequirePermission('ProjectCategory', 'delete')
    @Delete(':id')
    async deleteProjectCategory(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.projectcategoryService.deleteProjectCategory(id, applicationId);
    }
    
  @RequirePermission('ProjectCategory', 'read')
  @ApiOperation({ summary: 'Get LifecycleTemplate (lifecycletemplate) for ProjectCategory' })
  @Get(':id/lifecycletemplate')
  getLifecycleTemplate(@Param('id') id: number) {
    return this.projectcategoryService.getLifecycleTemplate(id);
  }

  @RequirePermission('ProjectCategory', 'read')
  @ApiOperation({ summary: 'Get ClosureTemplate (closuretemplate) for ProjectCategory' })
  @Get(':id/closuretemplate')
  getClosureTemplate(@Param('id') id: number) {
    return this.projectcategoryService.getClosureTemplate(id);
  }

  @RequirePermission('ProjectCategory', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for ProjectCategory' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.projectcategoryService.getOrganization(id);
  }

  @RequirePermission('ProjectCategory', 'read')
  @ApiOperation({ summary: 'Get Benchmark (benchmark) for ProjectCategory' })
  @Get(':id/benchmark')
  getBenchmark(@Param('id') id: number) {
    return this.projectcategoryService.getBenchmark(id);
  }

  @RequirePermission('ProjectCategory', 'read')
  @ApiOperation({ summary: 'Get Project list (projects) for ProjectCategory' })
  @Get(':id/projects')
  getProjects(@Param('id') id: number) {
    return this.projectcategoryService.getProjects(id);
  }

  }
