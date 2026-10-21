import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { hasFeature } from '../guards/features';
import { getTenantContext } from '../organization-scope/tenant-context';
import type { Actor } from './access';
import { DashboardEngineService } from './dashboard-engine.service';

interface AuthenticatedRequest {
  userId?: string;
  userEmail?: string;
  userPermissions?: Record<string, any>;
  isPlatformAdmin?: boolean;
  headers: Record<string, any>;
}

/**
 * Dynamic Dashboards: dashboards from the Dashboard Engine, shown inside this app.
 *
 * Who may do what is decided in ./access.ts and the service; this controller only works out WHO is
 * calling. The app owner (platform administrator) connects the app to the engine once; each
 * organization's administrator decides whether their organization uses dashboards and manages its
 * own dashboard list; everyone with the "Dynamic dashboards" switch sees what their organization has.
 */
@ApiTags('Dynamic Dashboards')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard-engine')
export class DashboardEngineController {
  constructor(private readonly engine: DashboardEngineService) {}

  private actor(req: AuthenticatedRequest): Actor {
    const isOwner = Boolean(req.isPlatformAdmin);
    const org = getTenantContext()?.organizationId;
    return {
      isOwner,
      organizationId: isOwner || typeof org !== 'number' || org <= 0 ? null : org,
      canManage: hasFeature(req, 'manageDynamicDashboards'),
      canView: hasFeature(req, 'dynamicDashboards'),
    };
  }

  private email(req: AuthenticatedRequest): string {
    return String(req.userEmail || '');
  }

  // ── Connection (settings page) ──
  @Get('connection')
  @ApiOperation({ summary: 'Connection status, policy and organizations (administrators)' })
  overview(@Req() req: AuthenticatedRequest) {
    return this.engine.overview(this.actor(req));
  }

  @Post('connection/start')
  @ApiOperation({ summary: 'Start connecting this app to the Dashboard Engine (app owner)' })
  start(@Req() req: AuthenticatedRequest, @Body() body: { engineUrl?: string; engineApiUrl?: string; workspaceName?: string }) {
    return this.engine.start(this.actor(req), body, this.email(req), req.headers['origin']);
  }

  @Post('connection/complete')
  @ApiOperation({ summary: 'Finish connecting with the code the engine returned (app owner)' })
  complete(@Req() req: AuthenticatedRequest, @Body() body: { code?: string; state?: string; error?: string }) {
    return this.engine.complete(this.actor(req), body, this.email(req));
  }

  @Post('connection/check')
  @ApiOperation({ summary: 'Ask the engine whether this app is still connected' })
  check(@Req() req: AuthenticatedRequest) {
    return this.engine.check(this.actor(req));
  }

  @Delete('connection')
  @ApiOperation({ summary: 'Disconnect this app from the Dashboard Engine (app owner)' })
  disconnect(@Req() req: AuthenticatedRequest) {
    return this.engine.disconnectApp(this.actor(req), this.email(req));
  }

  @Put('connection/policy')
  @ApiOperation({ summary: 'How organizations get dashboards (app owner)' })
  policy(@Req() req: AuthenticatedRequest, @Body() body: { policy?: string; lockOptOut?: boolean }) {
    return this.engine.setPolicy(this.actor(req), body, this.email(req));
  }

  // ── Organizations ──
  @Put('organizations/:orgId')
  @ApiOperation({ summary: 'Turn dashboards on or off for an organization' })
  setOrganization(
    @Req() req: AuthenticatedRequest,
    @Param('orgId', ParseIntPipe) orgId: number,
    @Body() body: { enabled?: boolean },
  ) {
    return this.engine.setOrganization(this.actor(req), orgId, body?.enabled === true, this.email(req));
  }

  @Post('organizations/:orgId/request')
  @ApiOperation({ summary: 'Ask the app owner to turn dashboards on for my organization' })
  requestOrganization(@Req() req: AuthenticatedRequest, @Param('orgId', ParseIntPipe) orgId: number) {
    return this.engine.requestOrganization(this.actor(req), orgId, this.email(req));
  }

  // ── Dashboard list ──
  @Get('dashboards')
  @ApiOperation({ summary: 'The dashboards this person can open' })
  list(@Req() req: AuthenticatedRequest) {
    return this.engine.listForViewer(this.actor(req));
  }

  @Post('dashboards')
  @ApiOperation({ summary: 'Add a dashboard by pasting its embed code' })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { code?: string; title?: string; description?: string; organizationId?: number | string | null },
  ) {
    return this.engine.create(this.actor(req), body, this.email(req));
  }

  @Patch('dashboards/:id')
  @ApiOperation({ summary: 'Rename, reorder or replace the embed code of a dashboard' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { code?: string; title?: string; description?: string; sortOrder?: number },
  ) {
    return this.engine.update(this.actor(req), id, body);
  }

  @Delete('dashboards/:id')
  @ApiOperation({ summary: 'Remove a dashboard from the list (the dashboard itself stays in the engine)' })
  remove(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.engine.remove(this.actor(req), id);
  }

  @Get('dashboards/:id/embed')
  @ApiOperation({ summary: 'What the dashboard page shows in its frame' })
  embed(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.engine.embedFor(this.actor(req), id);
  }
}
