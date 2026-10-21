import { Module } from '@nestjs/common';
import { WorkItemAssigneeController } from './workitemassignee.controller';
import { WorkItemAssigneeService } from './workitemassignee.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [WorkItemAssigneeController],
  providers: [WorkItemAssigneeService],
})
export class WorkItemAssigneeModule {}
