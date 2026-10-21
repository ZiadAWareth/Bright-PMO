import { Module } from '@nestjs/common';
import { RiskMitigationController } from './riskmitigation.controller';
import { RiskMitigationService } from './riskmitigation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [RiskMitigationController],
  providers: [RiskMitigationService],
})
export class RiskMitigationModule {}
