import { Module } from '@nestjs/common';
import { WorkItemController } from './workitem.controller';
import { WorkItemService } from './workitem.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [WorkItemController],
  providers: [WorkItemService],
})
export class WorkItemModule {}
