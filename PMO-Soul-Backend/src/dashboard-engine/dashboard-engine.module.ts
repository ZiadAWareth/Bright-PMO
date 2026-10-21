import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardEngineController } from './dashboard-engine.controller';
import { DashboardEngineService } from './dashboard-engine.service';

/**
 * Dynamic Dashboards: this app's connection to the Dashboard Engine, which organizations use it,
 * and the list of engine dashboards shown in the sidebar. The dashboards themselves (their data,
 * charts and per-role widget permissions) live in the engine.
 */
@Module({
  imports: [PrismaModule],
  controllers: [DashboardEngineController],
  providers: [DashboardEngineService],
})
export class DashboardEngineModule {}
