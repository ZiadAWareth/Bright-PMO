import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { WorkflowStartService } from './workflow-start.service';

/**
 * Starting a workflow by hand, from a button on a record or a list.
 *
 * Deliberately NOT on WorkflowController, which requires a `Workflow` permission on every route:
 * the person pressing the button is an ordinary user who has none. The gate here is READ on the
 * trigger's own entity, which is the right ceiling because the runner executes the workflow as
 * the triggering user.
 */
@ApiTags('Workflow Start')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('workflow-start')
export class WorkflowStartController {
  constructor(private readonly starter: WorkflowStartService) {}

  @Get()
  @ApiOperation({ summary: 'List workflows the caller can start by hand' })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'source', required: false, description: 'record | list' })
  async list(
    @Request() req: any,
    @Query('entity') entity?: string,
    @Query('source') source?: string,
  ) {
    return this.starter.listStartable(req.userPermissions, !!req.isPlatformAdmin, entity, source);
  }

  @Get(':id/can-start')
  @ApiOperation({ summary: 'Would starting this workflow on this record be accepted now? { allowed, reason? }' })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'recordId', required: false })
  async canStart(@Param('id') id: string, @Request() req: any, @Query('recordId') recordId?: string) {
    return this.starter.canStart(id, recordId, req.userPermissions, !!req.isPlatformAdmin);
  }

  @Post(':id')
  @ApiOperation({ summary: 'Start a workflow by hand' })
  @ApiParam({ name: 'id' })
  async start(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { recordId?: string | number; variables?: Record<string, unknown> },
  ) {
    return this.starter.start(id, body ?? {}, req.userPermissions, !!req.isPlatformAdmin);
  }
}
