import { Module } from '@nestjs/common';
import { MaintenanceLogController } from './maintenancelog.controller';
import { MaintenanceLogService } from './maintenancelog.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [MaintenanceLogController],
  providers: [MaintenanceLogService],
})
export class MaintenanceLogModule {}
