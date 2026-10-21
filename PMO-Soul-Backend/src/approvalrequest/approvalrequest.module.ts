import { Module } from '@nestjs/common';
import { ApprovalRequestController } from './approvalrequest.controller';
import { ApprovalRequestService } from './approvalrequest.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ApprovalRequestController],
  providers: [ApprovalRequestService],
})
export class ApprovalRequestModule {}
