import { Module } from '@nestjs/common';
import { ResourceAssignmentController } from './resourceassignment.controller';
import { ResourceAssignmentService } from './resourceassignment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ResourceAssignmentController],
  providers: [ResourceAssignmentService],
})
export class ResourceAssignmentModule {}
