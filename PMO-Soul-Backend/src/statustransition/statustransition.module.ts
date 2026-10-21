import { Module } from '@nestjs/common';
import { StatusTransitionController } from './statustransition.controller';
import { StatusTransitionService } from './statustransition.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [StatusTransitionController],
  providers: [StatusTransitionService],
})
export class StatusTransitionModule {}
