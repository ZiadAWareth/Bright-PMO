import { Module } from '@nestjs/common';
import { WorkItemStatusController } from './workitemstatus.controller';
import { WorkItemStatusService } from './workitemstatus.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [WorkItemStatusController],
  providers: [WorkItemStatusService],
})
export class WorkItemStatusModule {}
