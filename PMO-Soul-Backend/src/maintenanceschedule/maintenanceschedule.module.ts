import { Module } from '@nestjs/common';
import { MaintenanceScheduleController } from './maintenanceschedule.controller';
import { MaintenanceScheduleService } from './maintenanceschedule.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [MaintenanceScheduleController],
  providers: [MaintenanceScheduleService],
})
export class MaintenanceScheduleModule {}
