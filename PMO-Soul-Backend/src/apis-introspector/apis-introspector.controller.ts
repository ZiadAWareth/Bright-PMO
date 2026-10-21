import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { PermissionsGuard, RequirePermission } from '../guards/permissions.guard';
import { ApisIntrospectorService } from './apis-introspector.service';

@UseGuards(AuthGuard, PermissionsGuard)
@Controller('__introspection')
export class ApisIntrospectorController {
  constructor(private readonly introspectorService: ApisIntrospectorService) {}

  @Get('routes')
  @RequirePermission('Workflow', 'read')
  getRoutes() {
    console.log('[ApisIntrospector] 📡 GET /__introspection/routes endpoint called');
    const routes = this.introspectorService.getRoutes();
    console.log(`[ApisIntrospector] 📤 Returning ${routes.length} route(s) to client`);
    return routes;
  }
}
