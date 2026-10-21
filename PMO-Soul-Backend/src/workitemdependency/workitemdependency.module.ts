import { Module } from '@nestjs/common';
import { WorkItemDependencyController } from './workitemdependency.controller';
import { WorkItemDependencyService } from './workitemdependency.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [WorkItemDependencyController],
  providers: [WorkItemDependencyService],
})
export class WorkItemDependencyModule {}
