import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
import { WorkflowTasksService } from './workflow-tasks.service';

/**
 * A user's own workflow task inbox.
 *
 * Deliberately NOT permission-matrix guarded, mirroring the notification inbox: every
 * authenticated user may see and complete THEIR OWN tasks, and every query is scoped by the
 * authenticated userId, so one user can never read or complete another's work.
 *
 * Mounted at `workflow-tasks` rather than `tasks` because "Task" is a very common name for a
 * user's own entity, which already owns `/task`.
 */
@ApiTags('Workflow Tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('workflow-tasks')
export class WorkflowTasksController {
  constructor(private readonly tasks: WorkflowTasksService) {}

  // ─── Task console (Wave D) ──────────────────────────────────────────────────────────────
  // These are ADMIN routes, so unlike the inbox they ARE on the permission matrix: seeing and
  // moving other people's work is what Workflow `update` grants. `admin` is declared before
  // `:id` because Nest matches in declaration order.

  @Get('admin')
  @UseGuards(PermissionsGuard)
  @RequirePermission('Workflow', 'update')
  @ApiOperation({ summary: 'Every workflow task in the tenant (task console)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'workflowId', required: false })
  @ApiQuery({ name: 'assignee', required: false, description: 'A user id, or part of a name/email' })
  async listAdmin(
    @Query('status') status?: string,
    @Query('workflowId') workflowId?: string,
    @Query('assignee') assignee?: string,
  ) {
    return this.tasks.listAdmin({ status, workflowId, assignee });
  }

  @Post(':id/reassign')
  @UseGuards(PermissionsGuard)
  @RequirePermission('Workflow', 'update')
  @ApiOperation({ summary: 'Reassign an open task to users or to everyone holding a role' })
  @ApiParam({ name: 'id' })
  async reassign(@Param('id') id: string, @Body() body: { userIds?: number[]; role?: string }) {
    return this.tasks.reassign(id, body ?? {});
  }

  @Post(':id/claim')
  @UseGuards(PermissionsGuard)
  @RequirePermission('Workflow', 'update')
  @ApiOperation({ summary: 'Add yourself to an open task' })
  @ApiParam({ name: 'id' })
  async claim(@Param('id') id: string, @Request() req: any) {
    return this.tasks.claim(id, String(req.userId));
  }

  @Post(':id/cancel')
  @UseGuards(PermissionsGuard)
  @RequirePermission('Workflow', 'update')
  @ApiOperation({ summary: 'Withdraw an open task; its run takes the error edge or fails' })
  @ApiParam({ name: 'id' })
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.tasks.cancel(id, String(req.userId));
  }

  // ─── Inbox — ownership-scoped, not on the permission matrix ────────────────────────────

  @Get()
  @ApiOperation({ summary: "List the authenticated user's workflow tasks" })
  @ApiQuery({ name: 'status', required: false, description: 'Defaults to OPEN' })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tasks.listMine(String(req.userId), status, Number(limit));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of the authenticated user\'s tasks' })
  @ApiParam({ name: 'id' })
  async getOne(@Param('id') id: string, @Request() req: any) {
    return this.tasks.getMine(id, String(req.userId));
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Complete a task and continue its workflow',
    description:
      'Submits the collected fields and resumes the parked run down its "completed" branch.',
  })
  @ApiParam({ name: 'id' })
  async complete(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { formData?: Record<string, unknown> },
  ) {
    return this.tasks.complete(id, String(req.userId), body?.formData ?? {});
  }
}
