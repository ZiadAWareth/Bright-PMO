import { Module } from '@nestjs/common';
import { ApprovalPolicyStepController } from './approvalpolicystep.controller';
import { ApprovalPolicyStepService } from './approvalpolicystep.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ApprovalPolicyStepController],
  providers: [ApprovalPolicyStepService],
})
export class ApprovalPolicyStepModule {}
