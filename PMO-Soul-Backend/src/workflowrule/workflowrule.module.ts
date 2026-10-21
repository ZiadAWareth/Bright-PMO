import { Module } from '@nestjs/common';
import { WorkflowRuleController } from './workflowrule.controller';
import { WorkflowRuleService } from './workflowrule.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [WorkflowRuleController],
  providers: [WorkflowRuleService],
})
export class WorkflowRuleModule {}
