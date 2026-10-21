import { Module } from '@nestjs/common';
import { ApprovalStepController } from './approvalstep.controller';
import { ApprovalStepService } from './approvalstep.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ApprovalStepController],
  providers: [ApprovalStepService],
})
export class ApprovalStepModule {}
