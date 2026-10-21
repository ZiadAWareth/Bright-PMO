import { Module } from '@nestjs/common';
import { ApprovalPolicyController } from './approvalpolicy.controller';
import { ApprovalPolicyService } from './approvalpolicy.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ApprovalPolicyController],
  providers: [ApprovalPolicyService],
})
export class ApprovalPolicyModule {}
