
  import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
  import { DocumentService } from './document.service';
  import { CreateDocumentDto } from './dto/create-document.dto';
  import { UpdateDocumentDto } from './dto/update-document.dto';
  import { AuthGuard } from '../guards/auth.guard';
  import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
  import { ApiOperation, ApiTags, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
  import type { AggregateRequest } from '../shared/aggregate';
  import { AGGREGATE_FUNCTIONS, AggregateRequestError } from '../shared/aggregate';
  import { FILTER_OPERATORS } from '../shared/query-filters';
  import { PrismaService } from '../prisma/prisma.service';
  import { loadControlledFields, controlledWrites, refusalMessage } from '../workflow/workflow-controlled-fields';

  
  @ApiTags('Document')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  @Controller('document')
  export class DocumentController {
  constructor(private readonly documentService: DocumentService, private readonly prisma: PrismaService) {}

  /**
   * A field a live workflow sets (its status, say) is the workflow's to change — otherwise a maker
   * could create a record already APPROVED and skip the checker. A platform admin may still write it
   * to repair data (owner's decision, 2026-10-01). The workflow itself writes through the service,
   * not this controller, so it is unaffected.
   */
  private async refuseWorkflowFields(dto: any, req: any) {
    if (req?.isPlatformAdmin) return;
    const hits = controlledWrites(await loadControlledFields(this.prisma), 'Document', dto);
    if (hits.length) throw new BadRequestException(refusalMessage(hits));
  }
  
    @ApiOperation({summary:'Get all documents',
    description: 'Retrieves all documents in the system with pagination, filtering, and sorting.'
})
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (0-based)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
    @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc/desc)' })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query' })
    @RequirePermission('Document', 'list')
    @Get()
    async getAllDocuments(
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
        
        const result: any = await this.documentService.getAllDocuments({
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
      summary: 'Aggregate documents',
      description:
        'One number for a dashboard card. Body: { fn, field?, where? } where fn is one of ' +
        AGGREGATE_FUNCTIONS.join(' | ') +
        ', field names a column on Document (required for everything but count; numeric for ' +
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
    // The SAME permission the list endpoint requires. A person who cannot see documents
    // must not be able to learn their total: one number is exactly the kind of disclosure that
    // looks harmless and is not.
    @RequirePermission('Document', 'list')
    @Post('aggregate')
    async aggregateDocuments(@Body() body: AggregateRequest){
        try {
          return await this.documentService.aggregateDocument(body);
        } catch (error) {
          // A request this app cannot answer honestly is a 400 naming the reason, never a 0 or a
          // 500. The validation itself lives in shared/aggregate.ts, which knows nothing of HTTP.
          if (error instanceof AggregateRequestError) throw new BadRequestException(error.message);
          throw error;
        }
    }

    @ApiOperation({summary:'Get a document by id'})
    @ApiParam({ name: 'id', type: Number, description: 'Document ID' })
    @RequirePermission('Document', 'read')
    @Get(':id')
    async getDocumentById(@Param('id', ParseIntPipe) id:number){
        return await this.documentService.getDocumentById(id);
    }

    @ApiOperation({summary:'Create a new document'})
    @RequirePermission('Document', 'create')
    @Post()
    async createDocument(@Body() createDocumentDto: CreateDocumentDto, @Request() req){
        await this.refuseWorkflowFields(createDocumentDto, req);
        const userId = req.userId;
        const applicationId = process.env.PROJECT_ID;
        return await this.documentService.createDocument(createDocumentDto, userId, applicationId);
    }

    @ApiOperation({summary:'Update a document'})
    @ApiParam({ name: 'id', type: Number, description: 'Document ID' })
    @RequirePermission('Document', 'update')
    @Patch(':id')
    async updateDocument(@Param('id', ParseIntPipe) id:number, @Body() updateDocumentDto: UpdateDocumentDto, @Request() req){
        await this.refuseWorkflowFields(updateDocumentDto, req);
        try {
            const userId = req.userId;
            const applicationId = process.env.PROJECT_ID;
            console.log('Controller - Received update request for document id:', id);
            console.log('Controller - Update DTO:', JSON.stringify(updateDocumentDto, null, 2));
            console.log('Controller - DTO keys:', Object.keys(updateDocumentDto));
            
            const result = await this.documentService.updateDocument(id, updateDocumentDto, userId, applicationId);
            
            console.log('Controller - Update successful, result:', JSON.stringify(result, null, 2));
            
            return result;
        } catch (error) {
            console.error('Controller - Update error:', error);
            console.error('Controller - Error message:', error.message);
            console.error('Controller - Error stack:', error.stack);
            throw error;
        }
    }

    @ApiOperation({summary:'Delete a document'})
    @ApiParam({ name: 'id', type: Number, description: 'Document ID' })
    @RequirePermission('Document', 'delete')
    @Delete(':id')
    async deleteDocument(@Param('id', ParseIntPipe) id:number, @Request() req){
        const applicationId = process.env.PROJECT_ID;
        return await this.documentService.deleteDocument(id, applicationId);
    }
    
  @RequirePermission('Document', 'read')
  @ApiOperation({ summary: 'Get Document (document) for Document' })
  @Get(':id/document')
  getDocument(@Param('id') id: number) {
    return this.documentService.getDocument(id);
  }

  @RequirePermission('Document', 'read')
  @ApiOperation({ summary: 'Get Document (documentPreviousVersion) for Document' })
  @Get(':id/documentpreviousversion')
  getDocumentPreviousVersion(@Param('id') id: number) {
    return this.documentService.getDocumentPreviousVersion(id);
  }

  @RequirePermission('Document', 'read')
  @ApiOperation({ summary: 'Get Project (project) for Document' })
  @Get(':id/project')
  getProject(@Param('id') id: number) {
    return this.documentService.getProject(id);
  }

  @RequirePermission('Document', 'read')
  @ApiOperation({ summary: 'Get WbsNode (wbsnode) for Document' })
  @Get(':id/wbsnode')
  getWbsNode(@Param('id') id: number) {
    return this.documentService.getWbsNode(id);
  }

  @RequirePermission('Document', 'read')
  @ApiOperation({ summary: 'Get WorkItem (workitem) for Document' })
  @Get(':id/workitem')
  getWorkItem(@Param('id') id: number) {
    return this.documentService.getWorkItem(id);
  }

  @RequirePermission('Document', 'read')
  @ApiOperation({ summary: 'Get User (user) for Document' })
  @Get(':id/user')
  getUser(@Param('id') id: number) {
    return this.documentService.getUser(id);
  }

  @RequirePermission('Document', 'read')
  @ApiOperation({ summary: 'Get Organization (organization) for Document' })
  @Get(':id/organization')
  getOrganization(@Param('id') id: number) {
    return this.documentService.getOrganization(id);
  }

  @RequirePermission('Document', 'read')
  @ApiOperation({ summary: 'Get ClosureItem list (closureitems) for Document' })
  @Get(':id/closureitems')
  getClosureItems(@Param('id') id: number) {
    return this.documentService.getClosureItems(id);
  }

  @RequirePermission('Document', 'read')
  @ApiOperation({ summary: 'Get Handover list (handovers) for Document' })
  @Get(':id/handovers')
  getHandovers(@Param('id') id: number) {
    return this.documentService.getHandovers(id);
  }

  }
