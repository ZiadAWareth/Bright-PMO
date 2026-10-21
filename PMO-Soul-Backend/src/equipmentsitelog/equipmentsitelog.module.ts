import { Module } from '@nestjs/common';
import { EquipmentSiteLogController } from './equipmentsitelog.controller';
import { EquipmentSiteLogService } from './equipmentsitelog.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [EquipmentSiteLogController],
  providers: [EquipmentSiteLogService],
})
export class EquipmentSiteLogModule {}
