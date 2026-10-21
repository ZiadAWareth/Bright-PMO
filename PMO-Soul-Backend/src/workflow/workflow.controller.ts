import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
import { WorkflowService } from './workflow.service';
import { WorkflowIoService } from './workflow-io.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowIo: WorkflowIoService,
  ) {}

  // ─── Runs & Incidents (Wave D) ─────────────────────────
  // Order matters: literal paths before parameterised ones (see RUN_ROUTES).

  @Get('runs/incidents')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: 'Runs that failed or were interrupted, newest first' })
  listIncidents() {
    return this.workflowService.listIncidents();
  }

  @Get('runs')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: 'List runs across workflows (paged, newest first)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'workflowId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  listRuns(
    @Query('status') status?: string,
    @Query('workflowId') workflowId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.workflowService.listRuns({
      status,
      workflowId,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('runs/:runId')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: 'Get a specific run with step details' })
  getRunDetail(@Param('runId') runId: string) {
    return this.workflowService.getRunDetail(runId);
  }

  @Post('runs/:runId/cancel')
  @RequirePermission('Workflow', 'update')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a live run (409 when it already finished)' })
  cancelRun(@Param('runId') runId: string) {
    return this.workflowService.cancelRun(runId);
  }

  @Post('runs/:runId/retry')
  @RequirePermission('Workflow', 'update')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start a fresh run with the same trigger data' })
  retryRun(@Param('runId') runId: string) {
    return this.workflowService.retryRun(runId);
  }

  // ─── Workflow CRUD ──────────────────────────────────────

  @Get()
  @RequirePermission('Workflow', 'list')
  @ApiOperation({ summary: 'List all workflows' })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('entityId') entityId?: string,
    @Query('status') status?: string,
  ) {
    return this.workflowService.findAll({ entityId, status });
  }

  @Get(':id')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: 'Get workflow by ID' })
  findOne(@Param('id') id: string) {
    return this.workflowService.findOne(id);
  }

  @Post()
  @RequirePermission('Workflow', 'create')
  @ApiOperation({ summary: 'Create a new workflow' })
  create(@Body() dto: CreateWorkflowDto) {
    return this.workflowService.create(dto);
  }

  // Import a workflow file (made by Export): check it, then create it as a Draft.
  @Post('import/check')
  @HttpCode(200)
  @RequirePermission('Workflow', 'create')
  @ApiOperation({ summary: 'Check a workflow file against this app without creating anything' })
  checkImport(@Body() body: { file?: unknown }) {
    return this.workflowIo.check(body?.file);
  }

  @Post('import')
  @RequirePermission('Workflow', 'create')
  @ApiOperation({ summary: 'Import a workflow file as a Draft' })
  importWorkflow(@Body() body: { file?: unknown; name?: string }) {
    return this.workflowIo.importFile(body?.file, body?.name);
  }

  @Patch(':id')
  @RequirePermission('Workflow', 'update')
  @ApiOperation({ summary: 'Update a workflow' })
  update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('Workflow', 'delete')
  @ApiOperation({ summary: 'Delete a workflow' })
  remove(@Param('id') id: string) {
    return this.workflowService.remove(id);
  }

  // ─── Activation ─────────────────────────────────────────

  @Post(':id/activate')
  @RequirePermission('Workflow', 'action:activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Activate a workflow' })
  activate(@Param('id') id: string) {
    return this.workflowService.setStatus(id, 'ACTIVE');
  }

  @Post(':id/deactivate')
  @RequirePermission('Workflow', 'action:deactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Deactivate a workflow' })
  deactivate(@Param('id') id: string) {
    return this.workflowService.setStatus(id, 'INACTIVE');
  }

  // ─── Versioning ─────────────────────────────────────────

  @Get(':id/versions')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: 'List workflow version history' })
  getVersions(@Param('id') id: string) {
    return this.workflowService.getVersions(id);
  }

  @Get(':id/versions/:versionId')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: 'One version of a workflow, with its steps' })
  getVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.workflowService.getVersion(id, versionId);
  }

  @Post(':id/rollback/:versionId')
  @RequirePermission('Workflow', 'action:rollback')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rollback to a previous version' })
  rollback(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.workflowService.rollback(id, versionId);
  }

  // ─── Test & Execution ───────────────────────────────────

  // A canvas that has never been saved: test while designing, save once the design is finished.
  @Post('test-draft')
  @RequirePermission('Workflow', 'action:test')
  @ApiOperation({ summary: 'Test-run steps that have not been saved yet' })
  testDraft(
    @Body() body: { definition?: any; entityName?: string; triggerData?: any; runId?: string; taskAnswers?: Record<string, Record<string, unknown>>; background?: boolean },
  ) {
    return this.workflowService.testDraft(body.definition, body.entityName, body.triggerData, body.runId, body.taskAnswers, body.background === true);
  }

  @Post(':id/test')
  @RequirePermission('Workflow', 'action:test')
  @ApiOperation({ summary: 'Test-run a workflow with sample data' })
  testRun(
    @Param('id') id: string,
    @Body() body: { triggerData?: any; runId?: string; taskAnswers?: Record<string, Record<string, unknown>>; background?: boolean; definition?: any },
  ) {
    return this.workflowService.testRun(id, body.triggerData, body.runId, body.taskAnswers, body.background === true, body.definition);
  }

  // A test started in the background: its result, Skip wait, and Stop — the starter's own only.
  @Get('test-runs/:runId')
  @RequirePermission('Workflow', 'action:test')
  @ApiOperation({ summary: 'Result of a background test run (or still running)' })
  testRunResult(@Param('runId') runId: string) {
    return this.workflowService.testRunResult(runId);
  }

  @Post('test-runs/:runId/skip-wait')
  @RequirePermission('Workflow', 'action:test')
  @ApiOperation({ summary: 'End the Wait a background test run is on, now' })
  skipTestWait(@Param('runId') runId: string) {
    return this.workflowService.skipTestWait(runId);
  }

  @Post('test-runs/:runId/cancel')
  @RequirePermission('Workflow', 'action:test')
  @ApiOperation({ summary: 'Stop a background test run' })
  cancelTestRun(@Param('runId') runId: string) {
    return this.workflowService.cancelTestRun(runId);
  }

  @Get(':id/runs')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: 'List execution runs for a workflow' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getRuns(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflowService.getRuns(id, {
      status,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // ─── Catalog ────────────────────────────────────────────

  @Get('meta/catalog')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: 'Get the workflow action/trigger catalog' })
  getCatalog() {
    return this.workflowService.getCatalog();
  }

  // PG-05 — lets the designer show how many other workflows already fire on the
  // same entity event, and in what order, BEFORE another one is added.
  @Get('meta/fan-out')
  @RequirePermission('Workflow', 'read')
  @ApiOperation({ summary: 'Workflows already active on an entity event' })
  @ApiQuery({ name: 'entityName', required: true })
  @ApiQuery({ name: 'excludeId', required: false })
  @ApiQuery({ name: 'triggerType', required: false })
  getFanOut(
    @Query('entityName') entityName: string,
    @Query('excludeId') excludeId?: string,
    @Query('triggerType') triggerType?: string,
  ) {
    return this.workflowService.getFanOut(entityName, excludeId, triggerType);
  }
}
