import { Module } from '@nestjs/common';
import { WorkItemLinkController } from './workitemlink.controller';
import { WorkItemLinkService } from './workitemlink.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [WorkItemLinkController],
  providers: [WorkItemLinkService],
})
export class WorkItemLinkModule {}
